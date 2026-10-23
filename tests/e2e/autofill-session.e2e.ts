import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { z } from "zod";
import { test, expect } from "./support/fixtures";
import { completion } from "./support/fake-ai";
import { revokeSessions } from "./support/helpers";
import { BASE_URL } from "./support/runtime";

async function extensionBrowser(blockCookies = false) {
  execFileSync("pnpm", ["run", "extension:build"], { stdio: "pipe" });
  const directory = await mkdtemp(join(tmpdir(), "autofill-session-"));
  if (blockCookies) {
    await mkdir(join(directory, "Default"));
    await writeFile(
      join(directory, "Default", "Preferences"),
      JSON.stringify({
        profile: { block_third_party_cookies: true, cookie_controls_mode: 1 },
      }),
    );
  }
  const path = resolve("extension");
  const context = await chromium.launchPersistentContext(directory, {
    channel: "chromium",
    args: [`--disable-extensions-except=${path}`, `--load-extension=${path}`],
  });
  return {
    context,
    async close() {
      await context.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

async function login(
  page: Page,
  candidate: { email: string; password: string },
) {
  await page.goto(`${BASE_URL}/sign-in`);
  await page.getByLabel("Email", { exact: true }).fill(candidate.email);
  await page.getByLabel("Password", { exact: true }).fill(candidate.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
}

async function panelFor(context: BrowserContext, url: string) {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const tab = await worker.evaluate(
    async (input) => {
      await chrome.storage.local.set({ appUrl: input.app });
      return (await chrome.tabs.query({})).find((tab) => tab.url === input.url)
        ?.id;
    },
    { url, app: BASE_URL },
  );
  if (tab === undefined) throw new Error("Application tab missing");
  const panel = await context.newPage();
  await panel.goto(
    `chrome-extension://${new URL(worker.url()).host}/panel.html?tab=${tab}`,
  );
  return panel;
}

async function chooseForm(panel: Page) {
  const option = panel.locator("#form-frame option").nth(1);
  await expect(option).toBeAttached();
  const value = await option.getAttribute("value");
  if (!value) throw new Error("Form missing");
  await panel.locator("#form-frame").selectOption(value);
}

const nativePanelResponse = z.object({
  id: z.number().optional(),
  result: z
    .object({
      result: z.object({
        value: z.object({ status: z.number(), message: z.string() }),
      }),
    })
    .optional(),
  error: z.object({ message: z.string() }).optional(),
});

/** Side panels are browser UI targets, so Playwright does not expose a Page. */
async function nativePanelSession(context: BrowserContext, opener: Page) {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const tabId = Number(new URL(opener.url()).searchParams.get("tab"));
  await worker.evaluate(
    async ({ tabId, path }) => {
      await chrome.sidePanel.setOptions({ tabId, path, enabled: true });
      await chrome.tabs.update(tabId, { active: true });
    },
    { tabId, path: `panel.html?tab=${tabId}` },
  );
  const pageSession = await context.newCDPSession(opener);
  const { targetInfo } = await pageSession.send("Target.getTargetInfo");
  await pageSession.send("Runtime.evaluate", {
    expression: `chrome.sidePanel.open({tabId:${tabId}})`,
    userGesture: true,
    awaitPromise: true,
  });
  const browser = context.browser();
  if (!browser) throw new Error("No Chromium browser");
  const root = await browser.newBrowserCDPSession();
  let targetId: string | undefined;
  await expect
    .poll(async () => {
      const { targetInfos } = await root.send("Target.getTargets");
      targetId = targetInfos.find(
        (target) =>
          target.url === opener.url() &&
          target.targetId !== targetInfo.targetId,
      )?.targetId;
      return Boolean(targetId);
    })
    .toBe(true);
  if (!targetId) throw new Error("Native side panel did not open");
  const { sessionId } = await root.send("Target.attachToTarget", {
    targetId,
    flatten: false,
  });
  try {
    return await new Promise<{ status: number; message: string }>(
      (resolve, reject) => {
        const receive = (raw: unknown) => {
          const event = z
            .object({ sessionId: z.string(), message: z.string() })
            .parse(raw);
          if (event.sessionId !== sessionId) return;
          const body: unknown = JSON.parse(event.message);
          const response = nativePanelResponse.parse(body);
          if (response.id !== 1) return;
          root.off("Target.receivedMessageFromTarget", receive);
          if (response.result) resolve(response.result.result.value);
          else
            reject(
              new Error(
                response.error?.message ?? "Side panel evaluation failed",
              ),
            );
        };
        root.on("Target.receivedMessageFromTarget", receive);
        void root
          .send("Target.sendMessageToTarget", {
            sessionId,
            message: JSON.stringify({
              id: 1,
              method: "Runtime.evaluate",
              params: {
                expression: `(async()=>{const response=await fetch(${JSON.stringify(`${BASE_URL}/api/applications`)},{credentials:"include"});await new Promise(done=>setTimeout(done,100));return {status:response.status,message:document.querySelector("#status").textContent};})()`,
                awaitPromise: true,
                returnByValue: true,
              },
            }),
          })
          .catch(reject);
      },
    );
  } finally {
    await root.detach();
    await pageSession.detach();
  }
}

test("@autofill reuses website login through the real API, rejects other accounts and recovers after revocation", async ({
  candidate,
  createCandidate,
  database,
  ai,
}) => {
  const browser = await extensionBrowser();
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(
      '<h1>Application</h1><label>First name <input id="first"></label>',
    );
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No form server");
  const url = `http://127.0.0.1:${address.port}/apply`;
  try {
    const accountPage = await browser.context.newPage();
    await login(accountPage, candidate);
    const form = await browser.context.newPage();
    await form.goto(url);
    let panel = await panelFor(browser.context, url);
    expect((await nativePanelSession(browser.context, panel)).status).toBe(200);
    await expect(panel.locator("#application option")).toHaveCount(2);
    await expect(panel.locator("#application")).toContainText(
      "Example Industries",
    );
    await chooseForm(panel);
    const foreign = await createCandidate();
    const body = {
      url,
      pageText: "Application",
      fields: [],
      clickables: [],
      unfilledNotSent: 0,
      history: [],
      applicationId: foreign.applicationId,
    };
    const denied = await browser.context.request.post(
      `${BASE_URL}/api/autofill`,
      { data: body },
    );
    expect(denied.status()).toBe(404);
    expect(ai.requests()).toHaveLength(0);
    ai.reply(
      completion(
        JSON.stringify({
          fills: [{ fieldId: "0", value: "Alex", drafted: false }],
          unanswered: [],
          click: null,
          status: "done",
          message: "Ready to review.",
        }),
      ),
    );
    await panel.locator("#start").click();
    await expect(form.locator("#first")).toHaveValue("Alex");
    await expect(panel.locator("#status")).toContainText(
      "submit the application yourself",
    );
    expect(ai.requests()).toHaveLength(1);
    await revokeSessions(database, candidate.id);
    await chooseForm(panel);
    await panel.locator("#start").click();
    await expect(panel.locator("#pause-message")).toContainText(
      "Sign in to the app",
    );
    expect(ai.requests()).toHaveLength(1);
    await login(accountPage, candidate);
    await panel.close();
    panel = await panelFor(browser.context, url);
    await chooseForm(panel);
    ai.reply(
      completion(
        JSON.stringify({
          fills: [],
          unanswered: [],
          click: null,
          status: "done",
          message: "Ready.",
        }),
      ),
    );
    await panel.locator("#start").click();
    await expect(panel.locator("#status")).toContainText(
      "submit the application yourself",
    );
    expect(ai.requests()).toHaveLength(2);
  } finally {
    await browser.close();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  }
});

test("@autofill gives actionable guidance if cookie policy blocks the website session", async ({
  candidate,
  ai,
}, testInfo) => {
  const browser = await extensionBrowser(true);
  try {
    const page = await browser.context.newPage();
    await login(page, candidate);
    const panel = await panelFor(browser.context, page.url());
    await expect
      .poll(
        async () =>
          (await panel.locator("#application option").count()) === 2 ||
          (await panel.locator("#status").innerText()).includes("Sign in"),
      )
      .toBe(true);
    const native = await nativePanelSession(browser.context, panel);
    expect([200, 401]).toContain(native.status);
    if (native.status === 401) {
      expect(native.message).toContain("cookie or privacy settings");
    } else {
      await expect(panel.locator("#application option")).toHaveCount(2);
    }
    expect(ai.requests()).toHaveLength(0);
    await testInfo.attach("cookie-policy", {
      body: JSON.stringify({
        blockThirdPartyCookies: true,
        nativeSidePanel: true,
        sessionForwarded: native.status === 200,
      }),
      contentType: "application/json",
    });
  } finally {
    await browser.close();
  }
});
