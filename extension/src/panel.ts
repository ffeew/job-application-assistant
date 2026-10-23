/// <reference types="chrome" />
import "./zod-config";
import { z } from "zod";
import {
  applicationJsonResponseSchema,
  type ApplicationJsonResponse,
} from "@/app/api/applications/validators";
import {
  AUTOFILL_HISTORY_LINE_MAX,
  AUTOFILL_HISTORY_MAX,
  AUTOFILL_PAGE_TEXT_MAX,
  AUTOFILL_URL_MAX,
} from "@/app/api/autofill/limits";
import {
  autofillResponseSchema,
  type AutofillField,
} from "@/app/api/autofill/validators";
import { ApiError, parseJsonResponse, readApiError } from "@/lib/api-response";
import { matchApplication } from "./job-match";
import type { Extracted, PageFill, PageFlag, PageResume } from "./page";

interface Frame extends Extracted {
  frameId: number;
  documentId: string;
}

interface Need {
  label: string;
  reason: string;
}

type StepEnd =
  | { kind: "next" }
  | { kind: "done"; message: string }
  | {
      kind: "pause";
      message: string;
      needs?: Need[];
      // Fields the applicant is asked to answer become theirs.
      handOver?: { documentId: string; fieldIds: string[] };
    };

/** One application, from Start until it is done or stopped. */
interface Run {
  id: string;
  applicationId: string | undefined;
  host: string;
  frameId: number | null;
  frameOrigin: string;
  history: string[];
  /** Fills that failed this run, as "section›label=value", not tried again. */
  failed: Set<string>;
  clicks: Map<string, number>;
  shape: string;
  lastState: string;
  stalls: number;
  resume: PageResume | null | undefined;
  resumeAttached: boolean;
  step: number;
}

const tabId = Number(new URLSearchParams(location.search).get("tab"));
const APP_ERROR = "The app couldn't answer. Try again.";
const NO_ACCESS =
  "Chrome doesn't let extensions into this page, so it can't be filled.";
// Each step is a model call, so one Start or Continue is bounded before the
// applicant looks again.
const MAX_STEPS = 40;
const CLICK_LIMIT = 3;
// A Workday profile page can need several jobs and degrees added.
const ADD_LIMIT = 15;
const LOAD_WAIT_MS = 20_000;
const CHANGE_WAIT_MS = 15_000;
const POLL_MS = 300;

const element = <T extends HTMLElement>(id: string, type: new () => T): T => {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Missing #${id}`);
  return found;
};
const settings = element("settings", HTMLFormElement);
const appUrlInput = element("app-url", HTMLInputElement);
const fillSection = element("fill-section", HTMLElement);
const applicationSelect = element("application", HTMLSelectElement);
const applicationHint = element("application-hint", HTMLParagraphElement);
const formSelect = element("form-frame", HTMLSelectElement);
const rescanButton = element("rescan", HTMLButtonElement);
const startButton = element("start", HTMLButtonElement);
const editAddress = element("edit-address", HTMLButtonElement);
const stopButton = element("stop", HTMLButtonElement);
const status = element("status", HTMLParagraphElement);
const pauseSection = element("pause", HTMLElement);
const pauseMessage = element("pause-message", HTMLParagraphElement);
const needsList = element("needs", HTMLUListElement);
const continueButton = element("continue", HTMLButtonElement);
const stepsSection = element("steps", HTMLElement);
const stepLog = element("log", HTMLOListElement);

let appUrl = "";
let applications: ApplicationJsonResponse[] = [];
let chosenByUser = false;
let candidates: Frame[] = [];
let run: Run | null = null;
// Set while steps are running; Start and Continue do nothing until it clears.
let active: AbortController | null = null;

function say(message: string, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function log(message: string) {
  const item = document.createElement("li");
  item.textContent = message;
  stepLog.append(item);
  stepsSection.hidden = false;
}

function render() {
  startButton.disabled = run !== null || !formSelect.value || active !== null;
  formSelect.disabled = active !== null;
  rescanButton.disabled = active !== null;
  editAddress.disabled = run !== null;
  applicationSelect.disabled = run !== null;
  stopButton.hidden = run === null;
  continueButton.disabled = active !== null;
  if (active) pauseSection.hidden = true;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const hostOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((done, fail) => {
    const timer = setTimeout(done, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        fail(new Error("Stopped"));
      },
      { once: true },
    );
  });

async function api(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(new URL(path, appUrl), {
    ...init,
    credentials: "include",
  }).catch((error: unknown) => {
    if (init?.signal?.aborted) throw error;
    throw new Error(
      `Can't reach the app at ${appUrl}. Check the address and that the app is running.`,
    );
  });
  if (response.status === 401) {
    throw new ApiError(
      "Sign in to the app in this browser profile, then reopen the panel. If you're already signed in, check whether cookie or privacy settings block access to the app.",
      401,
    );
  }
  if (!response.ok) throw await readApiError(response, APP_ERROR);
  return response;
}

// The panel stays open while the tab moves between jobs. A choice made by hand
// stays; an automatic one follows the job the tab shows, and is kept with a
// hint when no saved job matches, as on an apply step with another path. A run
// keeps the job it started with.
function selectFor(url: string) {
  if (chosenByUser || run) return;
  const matched = matchApplication(url, applications);
  if (matched) applicationSelect.value = matched;
  applicationHint.hidden = Boolean(matched) || !applicationSelect.value;
}

async function loadApplications() {
  const response = await api("/api/applications");
  applications = await parseJsonResponse(
    response,
    z.array(applicationJsonResponseSchema),
    APP_ERROR,
  );
  const previous = applicationSelect.value;
  applicationSelect.replaceChildren(applicationSelect.options[0] ?? "");
  for (const application of applications) {
    applicationSelect.add(
      new Option(
        `${application.company}, ${application.position}`,
        application.id,
      ),
    );
  }
  if (chosenByUser && applications.some(({ id }) => id === previous)) {
    applicationSelect.value = previous;
    return;
  }
  chosenByUser = false;
  selectFor((await chrome.tabs.get(tabId)).url ?? "");
}

async function showFillSection() {
  settings.hidden = true;
  fillSection.hidden = false;
  try {
    say("Loading your applications…");
    await loadApplications();
    await scanFrames();
    say("");
  } catch (error) {
    say(errorMessage(error), true);
  }
}

/** Resolves once the tab has finished loading, or after a timeout. */
function tabLoaded(signal: AbortSignal): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      done();
    };
    const listener: Parameters<typeof chrome.tabs.onUpdated.addListener>[0] = (
      id,
      change,
    ) => {
      if (id === tabId && change.status === "complete") finish();
    };
    // Listen first, then check, so a load that completes in between is seen.
    chrome.tabs.onUpdated.addListener(listener);
    const timer = setTimeout(finish, LOAD_WAIT_MS);
    signal.addEventListener("abort", finish);
    void chrome.tabs.get(tabId).then((tab) => {
      if (tab.status !== "loading") finish();
    }, finish);
  });
}

async function readPage(
  settleFrameId: number | null,
  runId?: string,
): Promise<Frame[]> {
  const target = { tabId, allFrames: true };
  try {
    await chrome.scripting.executeScript({ target, files: ["dist/page.js"] });
    if (runId && settleFrameId !== null) {
      await chrome.scripting.executeScript({
        target: { tabId, frameIds: [settleFrameId] },
        func: (id: string) => globalThis.jaaBegin(id),
        args: [runId],
      });
    }
    await chrome.scripting.executeScript({
      target:
        settleFrameId === null ? target : { tabId, frameIds: [settleFrameId] },
      func: () => globalThis.jaaSettle(),
    });
    const injections = await chrome.scripting.executeScript({
      target,
      func: () => globalThis.jaaExtract(),
    });
    return injections.flatMap(({ frameId, documentId, result }) =>
      result ? [{ ...result, frameId, documentId }] : [],
    );
  } catch {
    throw new Error(NO_ACCESS);
  }
}

async function readFrames(current: Run, signal: AbortSignal) {
  let frames = await readPage(current.frameId, current.id);
  // A form frame that is still loading misses a read; wait for it rather than
  // switching to the page around it.
  for (
    let tries = 0;
    current.frameId !== null &&
    !frames.some((frame) => frame.frameId === current.frameId) &&
    tries < 5;
    tries++
  ) {
    await wait(1_000, signal);
    frames = await readPage(current.frameId, current.id);
  }
  return frames;
}

/** The user chooses the target; late-loading frames cannot replace it. */
function formFrame(current: Run, frames: Frame[]): Frame {
  const form = frames.find((frame) => frame.frameId === current.frameId);
  if (!form)
    throw new Error(
      "The selected form disappeared. Rescan and choose a form, then click Continue.",
    );
  return form;
}

async function scanFrames() {
  formSelect.value = "";
  render();
  candidates = (await readPage(null)).filter(
    (frame) =>
      frame.origin !== "null" &&
      (frame.fields.length || frame.clickables.length || frame.challenge),
  );
  formSelect.replaceChildren(new Option("Choose a form", ""));
  for (const frame of candidates) {
    const labels = frame.fields
      .slice(0, 3)
      .map((field) => field.label)
      .join(", ");
    formSelect.add(
      new Option(
        `${frame.origin} — ${frame.title || "Form"}${labels ? ` (${labels})` : ""}`,
        frame.documentId,
      ),
    );
  }
  render();
}

async function checkOrigins(current: Run, documentId: string) {
  const tab = await chrome.tabs.get(tabId);
  if (hostOf(tab.url ?? "") !== current.host)
    throw new Error(
      "The page changed sites. Rescan and confirm the form before continuing.",
    );
  const [frame] = await chrome.scripting
    .executeScript({
      target: { tabId, documentIds: [documentId] },
      func: () => location.origin,
    })
    .catch(() => []);
  if (frame?.result !== current.frameOrigin)
    throw new Error(
      "The form changed sites. Rescan and confirm the form before continuing.",
    );
}

async function probe(frame: Frame): Promise<[string, string]> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId, documentIds: [frame.documentId] },
    func: () => [globalThis.jaaShape(), globalThis.jaaState()],
  });
  return [injection?.result?.[0] ?? "", injection?.result?.[1] ?? ""];
}

/** Waits until the clicked frame shows a change or loads another document. */
async function waitForChange(
  frame: Frame,
  before: string,
  signal: AbortSignal,
) {
  for (let waited = 0; waited < CHANGE_WAIT_MS; waited += POLL_MS) {
    await wait(POLL_MS, signal);
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frame.frameId] },
        func: () =>
          typeof globalThis.jaaState === "function"
            ? globalThis.jaaState()
            : null,
      });
      if (
        !injection?.result ||
        injection.documentId !== frame.documentId ||
        injection.result !== before
      ) {
        return;
      }
    } catch {
      return;
    }
  }
}

async function loadResume(
  resumeId: string,
  signal: AbortSignal,
): Promise<PageResume | null> {
  try {
    const response = await api(
      `/api/resumes/${encodeURIComponent(resumeId)}/pdf`,
      { signal },
    );
    if (
      !/^application\/pdf(?:;|$)/i.test(
        response.headers.get("Content-Type") ?? "",
      )
    )
      return null;
    const name =
      /filename="([^"]+)"/.exec(
        response.headers.get("Content-Disposition") ?? "",
      )?.[1] ?? "resume.pdf";
    return {
      name,
      bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
    };
  } catch (error) {
    if (signal.aborted || (error instanceof ApiError && error.status === 401))
      throw error;
    return null;
  }
}

const fieldKey = (field: AutofillField | undefined) =>
  `${field?.section ?? ""}›${field?.label ?? ""}`;

async function step(current: Run, signal: AbortSignal): Promise<StepEnd> {
  await tabLoaded(signal);
  const url = (await chrome.tabs.get(tabId)).url ?? "";
  const host = hostOf(url);
  if (host !== current.host) {
    return {
      kind: "pause",
      message: `The page moved to ${host || "another site"}. If this is still the application, click Continue.`,
    };
  }

  let frames = await readFrames(current, signal);
  let form = formFrame(current, frames);
  if (form.origin !== current.frameOrigin)
    return {
      kind: "pause",
      message: `The form moved to ${form.origin}. Rescan and confirm the form before continuing.`,
    };
  if (form.challenge) return { kind: "pause", message: form.challenge };
  // An empty read may be a step between two loads. If it stays empty, it is
  // likely the final review page, which the model ends the run on.
  if (!form.fields.length && !form.clickables.length) {
    await wait(1_000, signal);
    frames = await readFrames(current, signal);
    form = formFrame(current, frames);
  }

  const [shape, state] = await probe(form);
  if (shape !== current.shape) {
    current.shape = shape;
    // Each new step may have its own "Next"; adding entries is counted per run.
    for (const key of current.clicks.keys()) {
      if (!key.startsWith("add:")) current.clicks.delete(key);
    }
  }
  current.stalls = state === current.lastState ? current.stalls + 1 : 0;
  current.lastState = state;
  if (current.stalls >= 2) {
    return {
      kind: "pause",
      message:
        "The page hasn't changed for two steps. Take this step yourself, then click Continue.",
    };
  }

  current.step += 1;
  await checkOrigins(current, form.documentId);
  const response = await api("/api/autofill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      url: url.split(/[?#]/)[0]?.slice(0, AUTOFILL_URL_MAX),
      pageText: form.pageText.slice(0, AUTOFILL_PAGE_TEXT_MAX),
      applicationId: current.applicationId,
      fields: form.fields,
      clickables: form.clickables,
      unfilledNotSent: form.unfilledNotSent,
      history: current.history.slice(-AUTOFILL_HISTORY_MAX),
    }),
  });
  const plan = await parseJsonResponse(
    response,
    autofillResponseSchema,
    APP_ERROR,
  );

  const fields = new Map(form.fields.map((field) => [field.id, field]));
  const needs = new Map<string, string>(
    plan.unanswered.map((item) => [item.fieldId, item.reason]),
  );
  // A fill that failed already would fail again; a required one needs you.
  let stuck = false;
  const fills: PageFill[] = [];
  for (const fill of plan.fills) {
    const field = fields.get(fill.fieldId);
    if (field?.kind === "file" && current.resumeAttached) continue;
    if (current.failed.has(`${fieldKey(field)}=${fill.value}`)) {
      needs.set(fill.fieldId, "The assistant couldn't fill this.");
      stuck ||= field?.required ?? false;
      continue;
    }
    fills.push(fill);
  }
  const flags: PageFlag[] = [...needs].map(([fieldId, reason]) => ({
    fieldId,
    reason,
  }));
  if (
    current.resume === undefined &&
    plan.resumeId &&
    fills.some((fill) => fields.get(fill.fieldId)?.kind === "file")
  ) {
    current.resume = await loadResume(plan.resumeId, signal);
  }

  signal.throwIfAborted();
  await checkOrigins(current, form.documentId);
  signal.throwIfAborted();
  const [applied] = await chrome.scripting
    .executeScript({
      // documentIds pins the fill to the document that was read; one that
      // has navigated since is rejected rather than filled with stale answers.
      target: { tabId, documentIds: [form.documentId] },
      func: (
        pageFills: PageFill[],
        pageFlags: PageFlag[],
        pageResume: PageResume | null,
        runId: string,
      ) =>
        typeof globalThis.jaaApply === "function"
          ? globalThis.jaaApply(pageFills, pageFlags, pageResume, runId)
          : null,
      args: [fills, flags, current.resume ?? null, current.id],
    })
    .catch(() => []);
  const outcomes = applied?.result;
  if (!outcomes) return { kind: "next" };

  const count = { filled: 0, drafted: 0, flagged: 0, kept: 0 };
  const failures: string[] = [];
  let requiredFailed = false;
  for (const outcome of outcomes) {
    const field = fields.get(outcome.fieldId);
    const fill = fills.find((item) => item.fieldId === outcome.fieldId);
    if (!fill) continue;
    count[outcome.status] += 1;
    if (field?.kind === "file" && outcome.status !== "flagged") {
      current.resumeAttached = true;
    }
    if (outcome.status === "flagged") {
      current.failed.add(`${fieldKey(field)}=${fill.value}`);
      failures.push(`"${field?.label ?? ""}" (${outcome.reason ?? ""})`);
      needs.set(outcome.fieldId, outcome.reason ?? "Check this yourself.");
      requiredFailed ||= field?.required ?? false;
    }
  }

  const target =
    plan.click &&
    form.clickables.find((item) => item.id === plan.click?.targetId);
  const summary = [
    `${String(count.filled)} filled`,
    count.drafted ? `${String(count.drafted)} drafted` : "",
    count.kept ? `${String(count.kept)} kept as you left them` : "",
    failures.length ? `couldn't fill ${failures.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const record = (action: string) => {
    log(`Step ${String(current.step)}: ${summary}${action}`);
    const where = (url.split(/[?#]/)[0] ?? "")
      .replace(/^[a-z]+:\/\//, "")
      .slice(0, 100);
    current.history.push(
      `${where}: ${summary}${action}`.slice(0, AUTOFILL_HISTORY_LINE_MAX),
    );
  };
  const pause = (message: string): StepEnd => {
    record("; paused");
    return {
      kind: "pause",
      message,
      needs: [...needs].map(([fieldId, reason]) => ({
        label: fields.get(fieldId)?.label || "Unlabelled field",
        reason,
      })),
      handOver: { documentId: form.documentId, fieldIds: [...needs.keys()] },
    };
  };

  if (plan.status === "done") {
    record("; done");
    return { kind: "done", message: plan.message };
  }
  if (plan.status === "handoff" || stuck) {
    return pause(
      plan.message ||
        "Answer the outlined questions, then click Continue to go on.",
    );
  }
  // Questions an answer revealed are planned before anything is clicked.
  if (count.filled + count.drafted > 0) {
    await chrome.scripting
      .executeScript({
        target: { tabId, documentIds: [form.documentId] },
        func: () => globalThis.jaaSettle(),
      })
      .catch(() => []);
    const [settled] = await probe(form).catch((): [string, string] => ["", ""]);
    if (settled !== shape) {
      record("; new questions appeared");
      return { kind: "next" };
    }
  }
  if (requiredFailed || !target) {
    record("");
    return { kind: "next" };
  }

  const clickKey =
    target.purpose === "add_entry"
      ? `add:${target.label}`
      : `${target.section ?? ""}›${target.label}`;
  const clicked = (current.clicks.get(clickKey) ?? 0) + 1;
  current.clicks.set(clickKey, clicked);
  if (clicked > (target.purpose === "add_entry" ? ADD_LIMIT : CLICK_LIMIT)) {
    return pause(
      `"${target.label}" was clicked ${String(clicked - 1)} times without the page moving on. Take this step yourself, then click Continue.`,
    );
  }

  signal.throwIfAborted();
  await checkOrigins(current, form.documentId);
  signal.throwIfAborted();
  const [click] = await chrome.scripting
    .executeScript({
      target: { tabId, documentIds: [form.documentId] },
      func: (id: string, label: string, runId: string) =>
        typeof globalThis.jaaClick === "function"
          ? globalThis.jaaClick(id, label, runId)
          : null,
      args: [target.id, target.label, current.id],
    })
    .catch(() => []);
  const refused = click?.result;
  if (refused === null || refused === undefined) {
    record("; the page changed before the click");
    return { kind: "next" };
  }
  if (refused) return pause(refused);
  record(`; clicked "${target.label}"`);
  await waitForChange(form, state, signal);
  return { kind: "next" };
}

function showPause(current: Run, end: Extract<StepEnd, { kind: "pause" }>) {
  if (run !== current) return;
  pauseMessage.textContent = end.message;
  needsList.replaceChildren();
  for (const need of end.needs ?? []) {
    const item = document.createElement("li");
    item.className = "needs";
    const name = document.createElement("strong");
    name.textContent = need.label;
    item.append(name, need.reason);
    needsList.append(item);
  }
  pauseSection.hidden = false;
  say("");
  if (end.handOver?.fieldIds.length) {
    const { documentId, fieldIds } = end.handOver;
    void chrome.scripting
      .executeScript({
        target: { tabId, documentIds: [documentId] },
        func: (ids: string[]) => {
          globalThis.jaaHandOver(ids);
        },
        args: [fieldIds],
      })
      .catch(() => []);
  }
}

function finish(message: string) {
  run = null;
  formSelect.value = "";
  render();
  say(
    `${message ? `${message} ` : ""}Check the outlined fields, then submit the application yourself.`,
  );
}

async function go() {
  const current = run;
  if (!current || active) return;
  const controller = new AbortController();
  active = controller;
  render();
  say("Filling the application…");
  try {
    for (let count = 0; count < MAX_STEPS; count++) {
      const end = await step(current, controller.signal);
      if (controller.signal.aborted || run !== current) return;
      if (end.kind === "done") {
        finish(end.message);
        return;
      }
      if (end.kind === "pause") {
        showPause(current, end);
        return;
      }
    }
    showPause(current, {
      kind: "pause",
      message: `Paused after ${String(MAX_STEPS)} steps. Click Continue to keep going.`,
    });
  } catch (error) {
    if (!controller.signal.aborted) {
      showPause(current, { kind: "pause", message: errorMessage(error) });
    }
  } finally {
    if (active === controller) active = null;
    render();
  }
}

startButton.addEventListener("click", () => {
  if (run) return;
  const selected = candidates.find(
    (frame) => frame.documentId === formSelect.value,
  );
  if (!selected) return;
  void chrome.tabs.get(tabId).then((tab) => {
    if (run) return;
    run = {
      id: crypto.randomUUID(),
      applicationId: applicationSelect.value || undefined,
      host: hostOf(tab.url ?? ""),
      frameId: selected.frameId,
      frameOrigin: selected.origin,
      history: [],
      failed: new Set(),
      clicks: new Map(),
      shape: "",
      lastState: "",
      stalls: 0,
      resume: undefined,
      resumeAttached: false,
      step: 0,
    };
    stepLog.replaceChildren();
    void go();
  });
});
continueButton.addEventListener("click", () => {
  const current = run;
  if (!current || active) return;
  void chrome.tabs.get(tabId).then(async (tab) => {
    const selected = candidates.find(
      (frame) => frame.documentId === formSelect.value,
    );
    if (!selected) {
      say("Rescan and choose a form before continuing.", true);
      return;
    }
    const frames = await readPage(selected.frameId, current.id);
    const form = frames.find((frame) => frame.frameId === selected.frameId);
    if (!form || form.origin !== selected.origin) {
      say("Rescan and choose the form at its current address.", true);
      return;
    }
    current.frameId = form.frameId;
    current.frameOrigin = form.origin;
    current.host = hostOf(tab.url ?? "");
    current.stalls = 0;
    current.lastState = "";
    void go();
  });
});
stopButton.addEventListener("click", () => {
  const stoppedRun = run;
  active?.abort();
  active = null;
  run = null;
  formSelect.value = "";
  pauseSection.hidden = true;
  render();
  say("Stopped. The page keeps what was filled so far.");
  // A slow fill may be running in the page; it checks this between fields.
  void chrome.scripting
    .executeScript({
      target: { tabId, allFrames: true },
      func: (id: string) => {
        if (typeof globalThis.jaaCancel === "function")
          globalThis.jaaCancel(id);
      },
      args: [stoppedRun?.id ?? ""],
    })
    .catch(() => []);
});

formSelect.addEventListener("change", render);
rescanButton.addEventListener("click", () => {
  void scanFrames().catch((error: unknown) => say(errorMessage(error), true));
});

settings.addEventListener("submit", (event) => {
  event.preventDefault();
  appUrl = new URL(appUrlInput.value).origin;
  void chrome.storage.local.set({ appUrl }).then(showFillSection);
});
editAddress.addEventListener("click", () => {
  appUrlInput.value = appUrl;
  settings.hidden = false;
  fillSection.hidden = true;
});
applicationSelect.addEventListener("change", () => {
  chosenByUser = true;
  applicationHint.hidden = true;
});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === tabId && change.url) selectFor(change.url);
});

void chrome.storage.local.get("appUrl").then((stored) => {
  const saved = z.object({ appUrl: z.string() }).safeParse(stored);
  if (saved.success) {
    appUrl = saved.data.appUrl;
    void showFillSection();
  }
});
