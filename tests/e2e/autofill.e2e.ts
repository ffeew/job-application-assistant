import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import { build } from "esbuild";
import type {
  Extracted,
  Outcome,
  PageFill,
  PageFlag,
  PageResume,
} from "../../extension/src/page";
import { finalizeFills } from "../../src/app/api/autofill/fills";
import {
  autofillRequestSchema,
  type AutofillRequest,
} from "../../src/app/api/autofill/validators";
import type { ResumeData } from "../../src/lib/resume-data";
import { agentAnswer, agentPages } from "./support/autofill-agent";

// The extension runs against a fixture page, not the app: the form comes from
// 127.0.0.1 and its iframe from localhost, so the frame is cross-origin, as an
// ATS embed on a company site is. The page script runs through
// chrome.scripting in the extension's isolated world, the same path the panel
// uses.

const formHtml = (frameOrigin: string) => `<!doctype html>
<html lang="en"><body>
<h1>Apply for Platform Engineer</h1>
<form>
  <label for="first">First name</label><input id="first" required>
  <label>Email <input id="email" type="email"></label>
  <span id="phone-label">Phone</span><input id="phone" aria-labelledby="phone-label">
  <input id="linkedin" aria-label="LinkedIn profile">
  <input id="portfolio" placeholder="Portfolio URL">
  <input id="tracking" aria-label="Hidden tracking" style="display:none">
  <input type="hidden" name="token" value="synthetic">
  <label for="resume">Resume/CV</label><button type="button">Attach</button>
  <input id="resume" type="file" style="display:none">
  <label for="country">Country</label>
  <select id="country">
    <option value="">Select…</option>
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </select>
  <label for="province">Province</label>
  <select id="province">
    <option value="">Select…</option>
    <option value="ca">California</option>
    <option value="ny">New York</option>
  </select>
  <fieldset><legend>Will you relocate?</legend>
    <label><input type="radio" name="relocate" value="1" style="display:none"> Yes</label>
    <label><input type="radio" name="relocate" value="0" style="display:none"> No</label>
  </fieldset>
  <fieldset><legend>Preferences</legend>
    <label><input type="checkbox" id="remote"> Open to remote work</label>
  </fieldset>
  <div><label><input type="checkbox" id="relocation"> Open to relocation</label></div>
  <div><span>Gender</span>
    <label><input type="checkbox"> Woman</label>
    <label><input type="checkbox"> Man</label>
    <input aria-label="Self-describe">
  </div>
  <div role="radiogroup" aria-label="Preferred shift">
    <div role="radio" aria-checked="false" tabindex="0">Day</div>
    <div role="radio" aria-checked="false" tabindex="-1">Night</div>
  </div>
  <label for="bio">Short bio</label><textarea id="bio" maxlength="20"></textarea>
  <div id="react-root"></div>
</form>
<form>
  <fieldset><legend>Relocate within the city?</legend>
    <label><input type="radio" name="relocate" value="yes"> Yes</label>
    <label><input type="radio" name="relocate" value="no"> No</label>
  </fieldset>
</form>
<iframe src="${frameOrigin}/frame" title="Address"></iframe>
<script>
  document.getElementById("country").addEventListener("change", (event) => {
    if (event.target.value !== "ca") return;
    document
      .getElementById("province")
      .replaceChildren(
        new Option("Select…", ""),
        new Option("Ontario", "on"),
        new Option("Quebec", "qc"),
      );
  });
  for (const radio of document.querySelectorAll('[role="radio"]')) {
    radio.addEventListener("click", () => {
      for (const other of document.querySelectorAll('[role="radio"]')) {
        other.setAttribute("aria-checked", String(other === radio));
      }
    });
  }
</script>
<script src="/fixture.js"></script>
</body></html>`;

const frameHtml = `<!doctype html>
<html lang="en"><body><form>
  <label for="city">City</label><input id="city">
</form></body></html>`;

let server: Server;
let origin: string;
let frameOrigin: string;
let userDataDir: string;
let context: BrowserContext;
let worker: Worker;

// The fixture server also stands in for the app: the panel's requests are
// checked against the route's schema, answered by a scripted model through the
// route's own rules, and recorded.
const steps: AutofillRequest[] = [];
const invalidSteps: unknown[] = [];
const visited: string[] = [];
const slowPaths = new Set(["/slow"]);
let raceArmed = false;

async function answerStep(body: string): Promise<[number, string]> {
  const parsed = autofillRequestSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    invalidSteps.push(parsed.error.issues);
    return [400, JSON.stringify({ error: "Invalid request data" })];
  }
  const request = parsed.data;
  steps.push(request);
  const path = new URL(request.url).pathname;
  if (slowPaths.has(path)) await new Promise((done) => setTimeout(done, 3_000));
  if (path === "/race") {
    raceArmed = true;
    await new Promise((done) => setTimeout(done, 500));
  }
  const plan = finalizeFills(agentAnswer(request), request, {
    profile: {} as ResumeData,
    job: null,
    coverLetter: null,
    resumeId: null,
  });
  return [200, JSON.stringify(plan)];
}

test.beforeAll(async () => {
  execFileSync("pnpm", ["run", "extension:build"], { stdio: "pipe" });
  const fixture = await build({
    entryPoints: ["tests/e2e/support/autofill-fixture.tsx"],
    bundle: true,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    tsconfig: "tsconfig.json",
    write: false,
  });
  const fixtureScript = fixture.outputFiles[0]?.text ?? "";

  server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://fixture");
    visited.push(`${url.pathname}${url.search}`);
    const send = (status: number, type: string, body: string) => {
      response.writeHead(status, { "Content-Type": type });
      response.end(body);
    };
    if (url.pathname === "/api/autofill" && request.method === "POST") {
      let body = "";
      request.on("data", (chunk: Buffer) => (body += chunk.toString()));
      request.on("end", () => {
        void answerStep(body).then(([status, json]) =>
          send(status, "application/json", json),
        );
      });
      return;
    }
    if (url.pathname === "/api/applications") {
      send(200, "application/json", "[]");
      return;
    }
    if (url.pathname === "/race-armed") {
      send(200, "text/plain", raceArmed ? "yes" : "no");
      return;
    }
    const pages: Record<string, [string, string] | undefined> = {
      "/form": ["text/html", formHtml(frameOrigin)],
      "/frame": ["text/html", frameHtml],
      "/fixture.js": ["text/javascript", fixtureScript],
      ...Object.fromEntries(
        Object.entries(agentPages(frameOrigin)).map(([path, html]) => [
          path,
          ["text/html", html] as [string, string],
        ]),
      ),
    };
    const page = pages[url.pathname];
    send(page ? 200 : 404, page?.[0] ?? "text/plain", page?.[1] ?? "");
  });
  await new Promise<void>((listening) => server.listen(0, listening));
  const { port } = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${String(port)}`;
  frameOrigin = `http://localhost:${String(port)}`;

  const extension = resolve("extension");
  userDataDir = await mkdtemp(join(tmpdir(), "autofill-extension-"));
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
});

test.afterAll(async () => {
  await context.close();
  await new Promise((closed) => server.close(closed));
  await rm(userDataDir, { recursive: true, force: true });
});

interface FrameRead {
  documentId: string;
  result: Extracted;
}

async function readTab(url: string) {
  return worker.evaluate(async (tabUrl) => {
    const tab = (await chrome.tabs.query({})).find(
      (candidate) => candidate.url === tabUrl,
    );
    if (tab?.id === undefined) throw new Error("Fixture tab not found");
    const target = { tabId: tab.id, allFrames: true };
    await chrome.scripting.executeScript({ target, files: ["dist/page.js"] });
    const injections = await chrome.scripting.executeScript({
      target,
      func: () => globalThis.jaaExtract(),
    });
    return {
      tabId: tab.id,
      frames: injections.flatMap(({ documentId, result }) =>
        result ? [{ documentId, result }] : [],
      ),
    };
  }, url);
}

async function applyIn(
  tabId: number,
  documentId: string,
  fills: PageFill[],
  flags: PageFlag[] = [],
  resume: PageResume | null = null,
): Promise<Outcome[]> {
  const outcomes = await worker.evaluate(
    async (input) => {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: input.tabId, documentIds: [input.documentId] },
        func: (
          pageFills: PageFill[],
          pageFlags: PageFlag[],
          pageResume: PageResume | null,
        ) => globalThis.jaaApply(pageFills, pageFlags, pageResume),
        args: [input.fills, input.flags, input.resume],
      });
      return injection?.result ?? null;
    },
    { tabId, documentId, fills, flags, resume },
  );
  if (!outcomes) throw new Error("The page script returned nothing");
  return outcomes;
}

test("the extension reads and fills a form in its page and a cross-origin frame", async () => {
  const page = await context.newPage();
  await page.goto(`${origin}/form`);
  await expect(
    page.getByRole("combobox", { name: "Start date" }),
  ).toBeVisible();
  await expect(page.frameLocator("iframe").getByLabel("City")).toBeVisible();

  const { tabId, frames } = await readTab(`${origin}/form`);
  const frameFor = (wanted: string): FrameRead => {
    const found = frames.find((frame) => frame.result.origin === wanted);
    if (!found) throw new Error(`No frame read from ${wanted}`);
    return found;
  };
  const top = frameFor(origin);
  const framed = frameFor(frameOrigin);
  const fieldFor = (label: string) => {
    const found = top.result.fields.find((field) => field.label === label);
    if (!found) throw new Error(`No field labelled ${label}`);
    return found;
  };

  expect(top.result.pageText).toContain("Apply for Platform Engineer");
  expect(fieldFor("First name")).toMatchObject({
    kind: "text",
    required: true,
  });
  expect(fieldFor("Email")).toMatchObject({ kind: "text", inputType: "email" });
  fieldFor("Phone");
  fieldFor("LinkedIn profile");
  fieldFor("Portfolio URL");
  expect(fieldFor("Resume/CV").kind).toBe("file");
  expect(fieldFor("Country")).toMatchObject({
    kind: "select",
    options: ["United States", "Canada"],
  });
  expect(fieldFor("Will you relocate?")).toMatchObject({
    kind: "radio",
    options: ["Yes", "No"],
  });
  expect(fieldFor("Relocate within the city?")).toMatchObject({
    kind: "radio",
    options: ["Yes", "No"],
  });
  expect(fieldFor("Preferences › Open to remote work").kind).toBe("checkbox");
  // A lone box takes no question from the form around it, but a group with a
  // self-describe box still gets its own.
  expect(fieldFor("Open to relocation").kind).toBe("checkbox");
  expect(
    top.result.fields.find((field) => field.label.endsWith("› Woman"))?.label,
  ).toMatch(/^Gender/);
  expect(fieldFor("Preferred shift")).toMatchObject({
    kind: "radio",
    options: ["Day", "Night"],
  });
  expect(fieldFor("Short bio")).toMatchObject({
    kind: "textarea",
    maxLength: 20,
  });
  expect(fieldFor("Preferred name").kind).toBe("text");
  expect(fieldFor("Start date").kind).toBe("combobox");
  expect(fieldFor("Office").kind).toBe("combobox");
  const labels = top.result.fields.map((field) => field.label);
  expect(labels).not.toContain("Hidden tracking");
  // Radix mirrors its select into an aria-hidden native one for form posts.
  expect(
    top.result.fields
      .filter((field) => field.kind === "select")
      .map((field) => field.label),
  ).toEqual(["Country", "Province"]);
  expect(framed.result.fields.map((field) => field.label)).toEqual(["City"]);

  const fill = (label: string, value: string, drafted = false) => ({
    fieldId: fieldFor(label).id,
    value,
    drafted,
  });
  const outcomes = await applyIn(
    tabId,
    top.documentId,
    [
      fill("First name", "Alex"),
      fill("Resume/CV", "resume"),
      fill("Country", "Canada"),
      // Filling Country refills this list after the page was read.
      fill("Province", "Ontario"),
      fill("Will you relocate?", "No"),
      fill("Preferences › Open to remote work", "true"),
      fill("Preferred shift", "Night"),
      fill("Short bio", "Far longer than twenty characters"),
      fill("Preferred name", "Lex", true),
      fill("Start date", "In two weeks"),
      fill("Office", "Lisbon"),
      fill("Team", "Platform"),
      fill("Region", "Narnia"),
    ],
    [{ fieldId: fieldFor("Email").id, reason: "Needs your answer" }],
    { name: "resume.pdf", bytes: Array.from(Buffer.from("%PDF-1.4\n")) },
  );
  const statusOf = (label: string) =>
    outcomes.find((outcome) => outcome.fieldId === fieldFor(label).id);

  await expect(page.locator("#first")).toHaveValue("Alex");
  expect(
    await page
      .locator("#resume")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("resume.pdf");
  await expect(page.locator("#country")).toHaveValue("ca");
  await expect(page.locator("#province")).toHaveValue("on");
  await expect(page.locator('input[name="relocate"][value="0"]')).toBeChecked();
  await expect(page.locator("#remote")).toBeChecked();
  await expect(page.getByRole("radio", { name: "Night" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator("#bio")).toHaveValue("");
  expect(statusOf("Short bio")).toMatchObject({ status: "flagged" });
  expect(statusOf("Short bio")?.reason).toContain("longer");
  await expect(page.locator("#preferred-state")).toHaveText("Lex");
  expect(statusOf("Preferred name")?.status).toBe("drafted");
  await expect(page.locator("#start-state")).toHaveText("later");
  await expect(page.getByRole("combobox", { name: "Start date" })).toHaveText(
    "In two weeks",
  );
  expect(statusOf("Start date")?.status).toBe("filled");
  await expect(page.getByRole("combobox", { name: "Office" })).toHaveValue(
    "Lisbon",
  );
  expect(statusOf("Team")?.reason).toContain("didn't keep");
  expect(statusOf("Region")?.reason).toContain("No matching option");
  // The hidden file input is outlined through its label, not the whole form.
  await expect(page.locator('label[for="resume"]')).toHaveAttribute(
    "title",
    "Filled from your profile",
  );
  await expect(page.locator("form").first()).not.toHaveAttribute("title");
  await expect(page.locator("#email")).toHaveAttribute(
    "title",
    "Needs your answer",
  );
  for (const label of [
    "First name",
    "Resume/CV",
    "Country",
    "Province",
    "Will you relocate?",
    "Preferences › Open to remote work",
    "Preferred shift",
    "Office",
  ]) {
    expect(statusOf(label)?.status, label).toBe("filled");
  }

  // A choice the widget already shows still counts as filled.
  const [again] = await applyIn(tabId, top.documentId, [
    fill("Start date", "In two weeks"),
  ]);
  expect(again?.status).toBe("filled");

  const city = framed.result.fields[0];
  if (!city) throw new Error("No City field");
  await applyIn(tabId, framed.documentId, [
    { fieldId: city.id, value: "Lisbon", drafted: false },
  ]);
  await expect(page.frameLocator("iframe").getByLabel("City")).toHaveValue(
    "Lisbon",
  );
});

/** Opens a fixture page and the extension's panel for its tab. */
async function openWithPanel(path: string) {
  const page = await context.newPage();
  await page.goto(`${origin}${path}`);
  const tabId = await worker.evaluate(async (url) => {
    const tab = (await chrome.tabs.query({})).find(
      (candidate) => candidate.url === url,
    );
    if (tab?.id === undefined) throw new Error("Fixture tab not found");
    await chrome.storage.local.set({ appUrl: new URL(url).origin });
    return tab.id;
  }, `${origin}${path}`);
  const panel = await context.newPage();
  await panel.goto(
    `chrome-extension://${new URL(worker.url()).host}/panel.html?tab=${String(tabId)}`,
  );
  await expect(panel.locator("#fill-section")).toBeVisible();
  return { page, panel };
}

const stepsFor = (path: string) =>
  steps.filter((step) => new URL(step.url).pathname === path);
const windowValue = (page: Page, name: string) =>
  page.evaluate(
    (key) => (window as unknown as Record<string, unknown>)[key],
    name,
  );
const DONE = "Check the outlined fields, then submit the application yourself.";

test.describe("the panel's run", () => {
  test.describe.configure({ timeout: 90_000 });

  test.afterEach(() => {
    expect(invalidSteps).toEqual([]);
  });

  test("works a Workday-style wizard to its review page and never submits", async () => {
    const { page, panel } = await openWithPanel("/workday");
    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect(panel.locator("#status")).toContainText(DONE, {
      timeout: 60_000,
    });

    expect(await windowValue(page, "saved")).toEqual({
      values: ["Engineer", "Acme", "Intern", "Beta", "Happy to relocate."],
      heard: "LinkedIn",
    });
    expect(await windowValue(page, "nextClicks")).toBe(1);
    expect(await windowValue(page, "submitted")).toBe(false);
    for (const step of stepsFor("/workday")) {
      for (const clickable of step.clickables) {
        expect(clickable.label).not.toMatch(/submit/i);
      }
    }
    expect(stepsFor("/workday").at(-1)?.fields).toEqual([]);
  });

  test("fills a form embedded from another site and leaves the page around it alone", async () => {
    const { page, panel } = await openWithPanel("/greenhouse");
    const form = page.frameLocator("#form");
    await expect(form.getByLabel("First name")).toBeVisible();
    await expect(
      page.frameLocator("#chat").getByLabel("Message"),
    ).toBeVisible();

    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect(panel.locator("#status")).toContainText(DONE, {
      timeout: 45_000,
    });

    await expect(form.getByLabel("First name")).toHaveValue("Alex");
    await expect(form.getByLabel("Yes")).toBeChecked();
    // The follow-up that "Yes" revealed was answered before the run ended.
    await expect(form.getByLabel("Where to?")).toHaveValue("Lisbon");
    await expect(page.locator("#newsletter")).toHaveValue("");
    await expect(page.frameLocator("#chat").getByLabel("Message")).toHaveValue(
      "",
    );
    const sent = stepsFor("/greenhouse");
    expect(sent.length).toBeGreaterThan(1);
    for (const step of sent) {
      expect(step.fields.map((field) => field.label)).not.toContain(
        "Newsletter email",
      );
      expect(step.fields.map((field) => field.label)).not.toContain("Message");
      expect(step.clickables).toEqual([]);
    }
    const frame = page
      .frames()
      .find((candidate) => candidate.url().endsWith("/greenhouse-form"));
    expect(
      await frame?.evaluate(
        () => (window as unknown as { submitted: boolean }).submitted,
      ),
    ).toBe(false);
  });

  test("follows a form across page loads, opening sections and saving a dialog entry", async () => {
    const { page, panel } = await openWithPanel("/steps/1");
    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect(panel.locator("#status")).toContainText(DONE, {
      timeout: 60_000,
    });

    expect(visited).toContain(
      "/steps/2?email=alex%40example.test&school=Lisbon+University",
    );
    await expect(page.locator("#certs li")).toHaveText([
      "AWS Solutions Architect",
    ]);
    expect(visited.some((path) => path.startsWith("/steps/done"))).toBe(false);
  });

  test("keeps the applicant's answers and never sends what they typed", async () => {
    const { page, panel } = await openWithPanel("/own");
    await page.locator("#preferred").fill("Lex");
    await panel.getByRole("button", { name: "Fill this application" }).click();

    await expect(panel.locator("#pause")).toBeVisible({ timeout: 30_000 });
    await expect(panel.locator("#pause-message")).toContainText(
      "Enter the code",
    );
    await expect(panel.locator("#needs")).toContainText("Verification code");
    await expect(page.locator("#phone")).toHaveValue("555-0100");
    await expect(page.locator("#relocation")).toBeChecked();

    await page.locator("#code").fill("123456");
    await page.locator("#relocation").uncheck();
    await panel.getByRole("button", { name: "Continue filling" }).dblclick();
    await expect(panel.locator("#status")).toContainText(DONE, {
      timeout: 30_000,
    });

    await expect(page.locator("#preferred")).toHaveValue("Lex");
    await expect(page.locator("#code")).toHaveValue("123456");
    await expect(page.locator("#relocation")).not.toBeChecked();
    const sent = JSON.stringify(stepsFor("/own"));
    expect(sent).not.toContain("Lex");
    expect(sent).not.toContain("123456");
    // A double click on Continue starts one run, not two.
    expect(
      stepsFor("/own").filter((step) => step.history.length === 1),
    ).toHaveLength(1);
  });

  test("pauses on a required field it can't fill instead of retrying", async () => {
    const { page, panel } = await openWithPanel("/fails");
    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect(panel.locator("#pause")).toBeVisible({ timeout: 30_000 });
    await expect(panel.locator("#needs")).toContainText("Phone");
    expect(stepsFor("/fails")).toHaveLength(2);
    expect(await windowValue(page, "nextClicks")).toBe(0);
  });

  test("stops without filling when Stop is pressed mid-step", async () => {
    const { page, panel } = await openWithPanel("/slow");
    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect.poll(() => stepsFor("/slow").length).toBe(1);
    await panel.getByRole("button", { name: "Stop filling" }).click();
    await expect(panel.locator("#status")).toContainText("Stopped");
    // The model's answer arrives after Stop and is never applied.
    await page.waitForTimeout(4_000);
    await expect(page.locator("#first")).toHaveValue("");
    expect(stepsFor("/slow")).toHaveLength(1);
  });

  test("pauses when a click doesn't change the page", async () => {
    const { page, panel } = await openWithPanel("/stuck");
    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect(panel.locator("#pause-message")).toContainText(
      "hasn't changed",
      { timeout: 60_000 },
    );
    expect(await windowValue(page, "nextClicks")).toBe(2);
  });

  test("refuses a click whose button turned into Submit after the page was read", async () => {
    const { page, panel } = await openWithPanel("/race");
    await panel.getByRole("button", { name: "Fill this application" }).click();
    await expect(panel.locator("#status")).toContainText(DONE, {
      timeout: 30_000,
    });
    expect(await windowValue(page, "submitted")).toBe(false);
    expect(await windowValue(page, "nextClicks")).toBe(0);
  });
});
