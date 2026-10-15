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
  <fieldset><legend>Will you relocate?</legend>
    <label><input type="radio" name="relocate" value="1" style="display:none"> Yes</label>
    <label><input type="radio" name="relocate" value="0" style="display:none"> No</label>
  </fieldset>
  <fieldset><legend>Preferences</legend>
    <label><input type="checkbox" id="remote"> Open to remote work</label>
  </fieldset>
  <div role="radiogroup" aria-label="Preferred shift">
    <div role="radio" aria-checked="false" tabindex="0">Day</div>
    <div role="radio" aria-checked="false" tabindex="-1">Night</div>
  </div>
  <label for="bio">Short bio</label><textarea id="bio" maxlength="20"></textarea>
  <div id="react-root"></div>
</form>
<iframe src="${frameOrigin}/frame" title="Address"></iframe>
<script>
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
    const pages: Record<string, [string, string] | undefined> = {
      "/form": ["text/html", formHtml(frameOrigin)],
      "/frame": ["text/html", frameHtml],
      "/fixture.js": ["text/javascript", fixtureScript],
    };
    const page = pages[request.url ?? ""];
    response.writeHead(page ? 200 : 404, {
      "Content-Type": page?.[0] ?? "text/plain",
    });
    response.end(page?.[1] ?? "");
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
  expect(fieldFor("Preferences › Open to remote work").kind).toBe("checkbox");
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
  const labels = top.result.fields.map((field) => field.label);
  expect(labels).not.toContain("Hidden tracking");
  // Radix mirrors its select into an aria-hidden native one for form posts.
  expect(
    top.result.fields.filter((field) => field.kind === "select"),
  ).toHaveLength(1);
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
      fill("Will you relocate?", "No"),
      fill("Preferences › Open to remote work", "true"),
      fill("Preferred shift", "Night"),
      fill("Short bio", "Far longer than twenty characters"),
      fill("Preferred name", "Lex", true),
      fill("Start date", "In two weeks"),
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
  await expect(page.locator("#email")).toHaveAttribute(
    "title",
    "Needs your answer",
  );
  for (const label of [
    "First name",
    "Resume/CV",
    "Country",
    "Will you relocate?",
    "Preferences › Open to remote work",
    "Preferred shift",
  ]) {
    expect(statusOf(label)?.status, label).toBe("filled");
  }

  const city = framed.result.fields[0];
  if (!city) throw new Error("No City field");
  await applyIn(tabId, framed.documentId, [
    { fieldId: city.id, value: "Lisbon", drafted: false },
  ]);
  await expect(page.frameLocator("iframe").getByLabel("City")).toHaveValue(
    "Lisbon",
  );
});
