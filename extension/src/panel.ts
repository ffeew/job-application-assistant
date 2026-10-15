/// <reference types="chrome" />
import "./zod-config";
import { z } from "zod";
import {
  applicationJsonResponseSchema,
  type ApplicationJsonResponse,
} from "@/app/api/applications/validators";
import {
  AUTOFILL_MAX_FIELDS,
  AUTOFILL_PAGE_TEXT_MAX,
  AUTOFILL_URL_MAX,
} from "@/app/api/autofill/limits";
import {
  autofillResponseSchema,
  type AutofillField,
  type AutofillResponse,
} from "@/app/api/autofill/validators";
import { parseJsonResponse, readApiError } from "@/lib/api-response";
import { matchApplication } from "./job-match";
import type {
  Extracted,
  Outcome,
  PageFill,
  PageFlag,
  PageResume,
} from "./page";

interface Frame extends Extracted {
  frameId: number;
  documentId: string;
}

const tabId = Number(new URLSearchParams(location.search).get("tab"));
const APP_ERROR = "The app couldn't answer. Try again.";

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
const fillButton = element("fill", HTMLButtonElement);
const editAddress = element("edit-address", HTMLButtonElement);
const status = element("status", HTMLParagraphElement);
const preview = element("preview", HTMLElement);
const framesList = element("frames", HTMLDivElement);
const applyButton = element("apply", HTMLButtonElement);
const results = element("results", HTMLElement);
const needsList = element("needs", HTMLUListElement);

let appUrl = "";
let applications: ApplicationJsonResponse[] = [];
let chosenByUser = false;
let frames: Frame[] = [];
let fields = new Map<string, AutofillField>();
let plan: AutofillResponse | null = null;

function say(message: string, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(new URL(path, appUrl), {
    ...init,
    credentials: "include",
  }).catch(() => {
    throw new Error(
      `Can't reach the app at ${appUrl}. Check the address and that the app is running.`,
    );
  });
  if (response.status === 401) {
    throw new Error(
      "You're signed out. Sign in to the app in this browser, then try again.",
    );
  }
  if (!response.ok) throw await readApiError(response, APP_ERROR);
  return response;
}

// The panel stays open while the tab moves between jobs. A choice made by hand
// stays; an automatic one follows the job the tab shows, and is kept with a
// hint when no saved job matches, as on an apply step with another path.
function selectFor(url: string) {
  if (chosenByUser) return;
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
    say("");
  } catch (error) {
    say(error instanceof Error ? error.message : String(error), true);
  }
}

async function readPage(): Promise<Frame[]> {
  const target = { tabId, allFrames: true };
  await chrome.scripting.executeScript({ target, files: ["dist/page.js"] });
  const injections = await chrome.scripting.executeScript({
    target,
    func: () => globalThis.jaaExtract(),
  });
  return injections
    .flatMap(({ frameId, documentId, result }) =>
      result?.fields.length ? [{ ...result, frameId, documentId }] : [],
    )
    .sort((a, b) => b.fields.length - a.fields.length);
}

function renderPreview(response: AutofillResponse) {
  const byFrame = new Map<number, HTMLUListElement>();
  const mostFields = frames[0]?.frameId;
  framesList.replaceChildren();
  for (const frame of frames) {
    const sheet = document.createElement("section");
    sheet.className = "sheet";
    const toggle = document.createElement("label");
    toggle.className = "row";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = String(frame.frameId);
    // Third-party widgets, such as chat or newsletter frames, get nothing
    // unless the user opts them in.
    box.checked = frame.frameId === mostFields;
    const site = document.createElement("strong");
    // Sandboxed frames have the opaque origin "null".
    const host =
      frame.origin === "null" ? "Sandboxed frame" : new URL(frame.origin).host;
    site.textContent = `${host} (${String(frame.fields.length)} fields)`;
    toggle.append(box, site);
    const list = document.createElement("ul");
    sheet.append(toggle, list);
    framesList.append(sheet);
    byFrame.set(frame.frameId, list);
  }

  const row = (fieldId: string, className: string, detail: string) => {
    const list = byFrame.get(Number(fieldId.split(":")[0]));
    if (!list) return;
    const item = document.createElement("li");
    item.className = className;
    const name = document.createElement("strong");
    name.textContent = fields.get(fieldId)?.label || "Unlabelled field";
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = detail;
    item.append(name, value);
    list.append(item);
  };
  for (const fill of response.fills) {
    const kind = fields.get(fill.fieldId)?.kind;
    row(
      fill.fieldId,
      fill.drafted ? "drafted" : "",
      kind === "file"
        ? "Your resume PDF"
        : fill.drafted
          ? `Drafted: ${fill.value}`
          : fill.value,
    );
  }
  for (const item of response.unanswered) {
    row(item.fieldId, "needs", `Needs you: ${item.reason}`);
  }
}

async function fillPage() {
  fillButton.disabled = true;
  preview.hidden = true;
  results.hidden = true;
  plan = null;
  try {
    say("Reading the form…");
    try {
      frames = await readPage();
    } catch {
      throw new Error(
        "Chrome doesn't let extensions into this page, so it can't be filled.",
      );
    }
    const namespaced = frames.flatMap((frame) =>
      frame.fields.map((field) => ({
        ...field,
        id: `${String(frame.frameId)}:${field.id}`,
      })),
    );
    if (!namespaced.length)
      throw new Error("No form fields were found on this page.");
    const sent = namespaced.slice(0, AUTOFILL_MAX_FIELDS);
    fields = new Map(sent.map((field) => [field.id, field]));
    const notSent =
      namespaced.length -
      sent.length +
      frames.reduce((total, frame) => total + frame.notSent, 0);

    say("Matching the form to your profile…");
    const tab = await chrome.tabs.get(tabId);
    const response = await api("/api/autofill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: (tab.url ?? "").slice(0, AUTOFILL_URL_MAX),
        pageText: [...frames]
          .sort((a, b) => a.frameId - b.frameId)
          .map((frame) => frame.pageText)
          .join("\n\n")
          .slice(0, AUTOFILL_PAGE_TEXT_MAX),
        applicationId: applicationSelect.value || undefined,
        fields: sent,
      }),
    });
    plan = await parseJsonResponse(response, autofillResponseSchema, APP_ERROR);
    renderPreview(plan);
    preview.hidden = false;
    say(
      notSent
        ? `${String(notSent)} fields were left out because the page is long. Fill them yourself.`
        : "",
    );
  } catch (error) {
    say(error instanceof Error ? error.message : String(error), true);
  } finally {
    fillButton.disabled = false;
  }
}

async function loadResume(resumeId: string): Promise<PageResume | null> {
  try {
    const response = await api(
      `/api/resumes/${encodeURIComponent(resumeId)}/pdf`,
    );
    const name =
      /filename="([^"]+)"/.exec(
        response.headers.get("Content-Disposition") ?? "",
      )?.[1] ?? "resume.pdf";
    return {
      name,
      bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
    };
  } catch {
    return null;
  }
}

async function applyPlan() {
  if (!plan) return;
  const current = plan;
  applyButton.disabled = true;
  try {
    const chosen = new Set(
      Array.from(
        framesList.querySelectorAll<HTMLInputElement>(
          "input[type=checkbox]:checked",
        ),
        (box) => Number(box.value),
      ),
    );
    const inChosenFrame = (fieldId: string) =>
      chosen.has(Number(fieldId.split(":")[0]));
    const needsResume = current.fills.some(
      (fill) =>
        inChosenFrame(fill.fieldId) &&
        fields.get(fill.fieldId)?.kind === "file",
    );

    say("Filling the page…");
    const resume =
      needsResume && current.resumeId
        ? await loadResume(current.resumeId)
        : null;
    const outcomes: Outcome[] = [];
    for (const frame of frames.filter((candidate) =>
      chosen.has(candidate.frameId),
    )) {
      const prefix = `${String(frame.frameId)}:`;
      const local = <T extends { fieldId: string }>(items: T[]) =>
        items
          .filter((item) => item.fieldId.startsWith(prefix))
          .map((item) => ({
            ...item,
            fieldId: item.fieldId.slice(prefix.length),
          }));
      const fills = local(current.fills);
      const flags = local(current.unanswered);
      try {
        // documentIds pins the fill to the document that was read; one that
        // has navigated since is rejected rather than filled with stale answers.
        const [injection] = await chrome.scripting.executeScript({
          target: { tabId, documentIds: [frame.documentId] },
          func: (
            pageFills: PageFill[],
            pageFlags: PageFlag[],
            pageResume: PageResume | null,
          ) =>
            typeof globalThis.jaaApply === "function"
              ? globalThis.jaaApply(pageFills, pageFlags, pageResume)
              : null,
          args: [fills, flags, resume],
        });
        if (!injection?.result) throw new Error("The page script is gone");
        outcomes.push(
          ...injection.result.map((outcome) => ({
            ...outcome,
            fieldId: prefix + outcome.fieldId,
          })),
        );
      } catch {
        for (const fill of fills) {
          outcomes.push({
            fieldId: prefix + fill.fieldId,
            status: "flagged",
            reason: "The page changed. Click Fill this page again.",
          });
        }
        for (const flag of flags) {
          outcomes.push({
            ...flag,
            fieldId: prefix + flag.fieldId,
            status: "flagged",
          });
        }
      }
    }

    const count = (wanted: Outcome["status"]) =>
      outcomes.filter((outcome) => outcome.status === wanted).length;
    say(
      `${String(count("filled"))} filled · ${String(count("drafted"))} drafted · ${String(count("flagged"))} need you. Check the outlined fields, then submit the application yourself.`,
    );
    needsList.replaceChildren();
    for (const outcome of outcomes.filter(
      (item) => item.status === "flagged",
    )) {
      const item = document.createElement("li");
      item.className = "needs";
      const name = document.createElement("strong");
      name.textContent =
        fields.get(outcome.fieldId)?.label || "Unlabelled field";
      item.append(name, outcome.reason ?? "");
      needsList.append(item);
    }
    preview.hidden = true;
    results.hidden = needsList.childElementCount === 0;
  } catch (error) {
    say(error instanceof Error ? error.message : String(error), true);
  } finally {
    applyButton.disabled = false;
  }
}

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
fillButton.addEventListener("click", () => void fillPage());
applyButton.addEventListener("click", () => void applyPlan());

void chrome.storage.local.get("appUrl").then((stored) => {
  const saved = z.object({ appUrl: z.string() }).safeParse(stored);
  if (saved.success) {
    appUrl = saved.data.appUrl;
    void showFillSection();
  }
});
