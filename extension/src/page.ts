// Injected into every frame of the job page by the side panel. It uses no
// chrome.* APIs, so the E2E test can drive it the same way the panel does.
import {
  AUTOFILL_GROUP_LABEL_MAX,
  AUTOFILL_LABEL_MAX,
  AUTOFILL_MAX_FIELDS,
  AUTOFILL_MAX_OPTIONS,
  AUTOFILL_OPTION_MAX,
  AUTOFILL_PAGE_TEXT_MAX,
} from "@/app/api/autofill/limits";
import type { AutofillField } from "@/app/api/autofill/validators";

type Kind = AutofillField["kind"];

export interface Extracted {
  origin: string;
  pageText: string;
  fields: AutofillField[];
  notSent: number;
}
export interface PageFill {
  fieldId: string;
  value: string;
  drafted: boolean;
}
export interface PageFlag {
  fieldId: string;
  reason: string;
}
export interface PageResume {
  name: string;
  bytes: number[];
}
export interface Outcome {
  fieldId: string;
  status: "filled" | "drafted" | "flagged";
  reason?: string;
}

declare global {
  var jaaExtract: () => Extracted;
  var jaaApply: (
    fills: PageFill[],
    flags: PageFlag[],
    resume: PageResume | null,
  ) => Promise<Outcome[]>;
}

const CONTROLS =
  'input, textarea, select, [role="combobox"], button[aria-haspopup="listbox"], [role="radio"], [role="checkbox"], [role="switch"]';
const SKIPPED_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "password",
]);
const COMBOBOX_WAIT_MS = 1_000;
const OUTLINES = {
  filled: "2px solid #1a7f4b",
  drafted: "2px dashed #9a5200",
  flagged: "2px dotted #b31b2c",
};

interface Entry {
  kind: Kind;
  elements: HTMLElement[];
  options: string[];
  maxLength?: number;
}
const registry = new Map<string, Entry>();

const clean = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim();
const normalize = (text: string) => clean(text).toLowerCase();
const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
const visible = (el: Element) =>
  el.getClientRects().length > 0 &&
  getComputedStyle(el).visibility !== "hidden";
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Text a person reads in a node, without the option lists of controls inside it. */
function textOf(node: Element): string {
  const copy = node.cloneNode(true);
  if (!(copy instanceof Element)) return "";
  copy
    .querySelectorAll('select, textarea, script, style, [role="listbox"]')
    .forEach((child) => child.remove());
  return clean(copy.textContent);
}

function byId(el: Element, id: string): Element | null {
  const root = el.getRootNode();
  const scoped =
    root instanceof ShadowRoot || root instanceof Document
      ? root.getElementById(id)
      : null;
  return scoped ?? document.getElementById(id);
}

function labelledBy(el: Element): Element[] {
  const ids = el.getAttribute("aria-labelledby")?.split(/\s+/) ?? [];
  return ids
    .map((id) => byId(el, id))
    .filter((node): node is Element => node !== null);
}

function ariaLabel(el: Element): string {
  const labelled = labelledBy(el).map(textOf).join(" ");
  return clean(labelled) || clean(el.getAttribute("aria-label"));
}

function labelsOf(el: HTMLElement): HTMLLabelElement[] {
  return el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLButtonElement
    ? Array.from(el.labels ?? [])
    : [];
}

function ownLabel(el: HTMLElement): string {
  return (
    clean(labelsOf(el).map(textOf).join(" ")) ||
    ariaLabel(el) ||
    clean(el.getAttribute("placeholder")) ||
    clean(el.getAttribute("title")) ||
    // ARIA radios and checkboxes are named by their own text. A combobox's
    // text is its current value, so it is not used as a name.
    (el.matches('[role="radio"], [role="checkbox"], [role="switch"]')
      ? textOf(el)
      : "")
  );
}

/**
 * The question a control answers. Fieldsets and ARIA groups name it directly;
 * otherwise the nearest ancestor with text beyond the control's own labels.
 */
function questionOf(el: HTMLElement, ownTexts: string[]): string {
  const group = el.closest('fieldset, [role="radiogroup"], [role="group"]');
  if (group instanceof HTMLFieldSetElement) {
    const legend = group.querySelector(":scope > legend");
    if (legend) return textOf(legend);
  }
  if (group) {
    const named = ariaLabel(group);
    if (named) return named;
  }
  const checkbox = kindOf(el) === "checkbox";
  let node = el.parentElement;
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    // A lone checkbox's ancestors soon hold the whole form. A checkbox
    // group's container holds at most one other field, such as "self-describe".
    if (checkbox && otherFields(node) >= 2) break;
    let text = textOf(node);
    for (const own of ownTexts) text = text.replace(own, " ");
    text = clean(text);
    if (text) return text;
  }
  return "";
}

/** Fillable controls in `node` other than checkboxes. */
function otherFields(node: Element): number {
  return Array.from(node.querySelectorAll<HTMLElement>(CONTROLS)).filter(
    (control) => {
      const kind = kindOf(control);
      return kind !== null && kind !== "checkbox" && usable(control, kind);
    },
  ).length;
}

function kindOf(el: Element): Kind | null {
  const role = el.getAttribute("role");
  if (
    role === "combobox" ||
    (el instanceof HTMLButtonElement &&
      el.getAttribute("aria-haspopup") === "listbox")
  ) {
    return "combobox";
  }
  if (el instanceof HTMLSelectElement) return "select";
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLInputElement) {
    if (SKIPPED_INPUT_TYPES.has(el.type)) return null;
    if (el.type === "radio" || el.type === "checkbox" || el.type === "file") {
      return el.type;
    }
    return "text";
  }
  if (role === "radio") return "radio";
  if (role === "checkbox" || role === "switch") return "checkbox";
  return null;
}

function collect(root: Document | ShadowRoot, found: HTMLElement[]) {
  for (const el of root.querySelectorAll("*")) {
    if (el instanceof HTMLElement && el.matches(CONTROLS)) found.push(el);
    if (el.shadowRoot) collect(el.shadowRoot, found);
  }
}

function usable(el: HTMLElement, kind: Kind): boolean {
  if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") {
    return false;
  }
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    el.readOnly
  ) {
    return false;
  }
  // ATS pages hide the real file input behind a button, and style radios and
  // checkboxes as their labels, so those count when their label shows.
  if (kind === "file") return true;
  // Component libraries mirror their widgets into aria-hidden native inputs
  // for form posts; filling the mirror would set the value twice.
  if (el.closest('[aria-hidden="true"]')) return false;
  if (visible(el)) return true;
  return (
    (kind === "radio" || kind === "checkbox") && labelsOf(el).some(visible)
  );
}

function label(question: string, own: string): string {
  const prefix = question.slice(0, AUTOFILL_GROUP_LABEL_MAX);
  return (prefix && own ? `${prefix} › ${own}` : prefix || own).slice(
    0,
    AUTOFILL_LABEL_MAX,
  );
}

function checked(el: HTMLElement): boolean {
  return el instanceof HTMLInputElement
    ? el.checked
    : el.getAttribute("aria-checked") === "true";
}

function extract(): Extracted {
  registry.clear();
  const found: HTMLElement[] = [];
  collect(document, found);

  const fields: AutofillField[] = [];
  const groups = new Map<Node, Map<string, Entry>>();
  let notSent = 0;

  for (const el of found) {
    const kind = kindOf(el);
    if (!kind || !usable(el, kind)) continue;

    if (kind === "radio") {
      // Same-named radios form one group within one form, or within one
      // document or shadow root when they have no form.
      const name = el instanceof HTMLInputElement ? el.name : "";
      const owner =
        el instanceof HTMLInputElement && name
          ? (el.form ?? el.getRootNode())
          : el.closest('[role="radiogroup"]');
      const group = owner ? groups.get(owner)?.get(name) : undefined;
      if (group) {
        group.elements.push(el);
        group.options.push(ownLabel(el));
        continue;
      }
      const entry: Entry = { kind, elements: [el], options: [ownLabel(el)] };
      if (owner) {
        groups.set(
          owner,
          (groups.get(owner) ?? new Map<string, Entry>()).set(name, entry),
        );
      }
      fields.push(
        register(entry, { label: "", required: isRequired(el), kind }),
      );
      continue;
    }

    const own = ownLabel(el);
    const entry: Entry = {
      kind,
      elements: [el],
      options: [],
      maxLength:
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
        el.maxLength > 0
          ? el.maxLength
          : undefined,
    };
    const question =
      kind === "checkbox" || !own ? questionOf(el, own ? [own] : []) : "";
    fields.push(
      register(entry, {
        kind,
        label: label(question, own),
        required: isRequired(el),
        inputType: el instanceof HTMLInputElement ? el.type : undefined,
        maxLength: entry.maxLength,
      }),
    );
  }

  // Radio groups learn their question once every option is known.
  for (const field of fields) {
    const entry = registry.get(field.id);
    if (entry?.kind !== "radio") continue;
    const first = entry.elements[0];
    if (first) {
      field.label = questionOf(first, entry.options).slice(
        0,
        AUTOFILL_LABEL_MAX,
      );
    }
    field.required = entry.elements.some(isRequired);
  }

  for (const field of fields) {
    const entry = registry.get(field.id);
    if (!entry) continue;
    if (entry.kind === "select" || entry.kind === "radio") {
      // Large lists, such as countries, are matched here after the model
      // names a value, so they don't fill the prompt. A placeholder such as
      // "Select…" has no value and is no answer.
      const [first] = entry.elements;
      const options = (
        first instanceof HTMLSelectElement
          ? Array.from(first.options)
              .filter((option) => option.value !== "")
              .map((option) => clean(option.text))
          : entry.options
      ).filter(Boolean);
      if (options.length <= AUTOFILL_MAX_OPTIONS) {
        field.options = options.map((option) =>
          option.slice(0, AUTOFILL_OPTION_MAX),
        );
      }
    }
  }

  if (fields.length > AUTOFILL_MAX_FIELDS) {
    notSent = fields.length - AUTOFILL_MAX_FIELDS;
    fields.length = AUTOFILL_MAX_FIELDS;
  }
  return {
    origin: location.origin,
    pageText: clean(document.body.innerText).slice(0, AUTOFILL_PAGE_TEXT_MAX),
    fields,
    notSent,
  };
}

function register(
  entry: Entry,
  field: Omit<AutofillField, "id">,
): AutofillField {
  const id = String(registry.size);
  registry.set(id, entry);
  return { id, ...field };
}

function isRequired(el: HTMLElement): boolean {
  return (
    ("required" in el && el.required === true) ||
    el.getAttribute("aria-required") === "true"
  );
}

/** Index of the option the value names: an exact match, else a unique prefix. */
function matchOption(value: string, options: string[]): number {
  const wanted = normalize(value);
  if (!wanted) return -1;
  const normalized = options.map(normalize);
  const exact = normalized.indexOf(wanted);
  if (exact !== -1) return exact;
  const prefixed = normalized.flatMap((option, index) =>
    option.startsWith(wanted) ? [index] : [],
  );
  return prefixed.length === 1 ? (prefixed[0] ?? -1) : -1;
}

function setText(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // React tracks the last value it set; the prototype setter bypasses that
  // tracker, so the input event below reaches its onChange.
  const prototype =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function listboxFor(el: HTMLElement, before: Set<Element>): Element | null {
  for (const attribute of ["aria-controls", "aria-owns"]) {
    const id = el.getAttribute(attribute);
    const named = id ? byId(el, id) : null;
    if (named?.querySelector('[role="option"]')) return named;
  }
  const opened = Array.from(
    document.querySelectorAll('[role="listbox"]'),
  ).filter((listbox) => !before.has(listbox));
  return opened.at(-1) ?? null;
}

/** How often `phrase` appears as consecutive words of `text`. */
function occurrences(text: string[], phrase: string[]): number {
  let count = 0;
  for (let start = 0; start + phrase.length <= text.length; start++) {
    if (phrase.every((word, index) => text[start + index] === word)) count++;
  }
  return count;
}

async function chooseOption(el: HTMLElement, value: string): Promise<string> {
  const before = new Set(document.querySelectorAll('[role="listbox"]'));
  // Typing opens a searchable list; blurring would close it again.
  if (el instanceof HTMLInputElement) {
    el.focus();
    setText(el, value);
  } else {
    el.click();
  }

  for (let waited = 0; waited < COMBOBOX_WAIT_MS; waited += 50) {
    await sleep(50);
    const listbox = listboxFor(el, before);
    const options = Array.from(
      listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    // A searchable list may still show stale options until its filter runs.
    const option = options[matchOption(value, options.map(textOf))];
    if (option) return pick(el, option);
  }
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  return "No matching option. Pick it yourself.";
}

/**
 * A click on the option proves nothing; the widget must now show it. Either
 * the control shows exactly the choice (a trigger's text, or an input's value,
 * which blur resets to the committed choice), or the choice appears once more
 * near it (react-select shows its value beside its input). Text that already
 * named the choice, such as "(Yes/No)", is counted before the click.
 */
async function pick(el: HTMLElement, option: HTMLElement): Promise<string> {
  const chosen = words(textOf(option));
  const scope = el.parentElement?.parentElement ?? el.parentElement ?? el;
  const nearby = () => occurrences(words(textOf(scope)), chosen);
  const nearbyBefore = nearby();
  option.click();
  // React commits the click's update after this task, and a blur handler run
  // before then would restore the old value.
  await sleep(50);
  // shortcut: a widget that keeps the typed text after blur (Downshift) passes
  // even if it ignored the click; type less than the whole choice to catch it.
  if (el instanceof HTMLInputElement) el.blur();
  await sleep(100);
  if (!chosen.length) return "Check this choice yourself.";
  const shown = words(el instanceof HTMLInputElement ? el.value : textOf(el));
  return shown.join(" ") === chosen.join(" ") || nearby() > nearbyBefore
    ? ""
    : "The list didn't keep the choice. Pick it yourself.";
}

async function fill(
  entry: Entry,
  value: string,
  resume: PageResume | null,
): Promise<string> {
  const [el] = entry.elements;
  if (!el || entry.elements.some((node) => !node.isConnected)) {
    return "The page changed. Click Fill this page again.";
  }

  switch (entry.kind) {
    case "text":
    case "textarea": {
      if (!(
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      )) {
        return "This field can't be filled.";
      }
      if (entry.maxLength && value.length > entry.maxLength) {
        return `The answer is longer than this field allows (${entry.maxLength} characters).`;
      }
      el.focus();
      setText(el, value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.blur();
      return el.value === value ? "" : "The field didn't accept this value.";
    }
    case "select": {
      if (!(el instanceof HTMLSelectElement))
        return "This field can't be filled.";
      // Read the options now: a dependent list, such as a state after its
      // country, may have been refilled since the page was read.
      const index = matchOption(
        value,
        Array.from(el.options, (option) => clean(option.text)),
      );
      if (index === -1) return "No matching option. Pick it yourself.";
      el.selectedIndex = index;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return el.selectedIndex === index
        ? ""
        : "The list didn't keep the choice.";
    }
    case "radio": {
      const target = entry.elements[matchOption(value, entry.options)];
      if (!target) return "No matching option. Pick it yourself.";
      if (!checked(target)) target.click();
      return checked(target)
        ? ""
        : "The choice didn't stick. Pick it yourself.";
    }
    case "checkbox": {
      const wanted = value === "true";
      if (checked(el) !== wanted) el.click();
      return checked(el) === wanted
        ? ""
        : "The box didn't change. Set it yourself.";
    }
    case "file": {
      if (!(el instanceof HTMLInputElement))
        return "This field can't be filled.";
      if (!resume)
        return "The resume PDF couldn't be loaded. Attach it yourself.";
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([Uint8Array.from(resume.bytes)], resume.name, {
          type: "application/pdf",
        }),
      );
      el.files = transfer.files;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return el.files[0]?.name === resume.name
        ? ""
        : "The file wasn't attached. Attach it yourself.";
    }
    case "combobox":
      return chooseOption(el, value);
  }
}

function mark(entry: Entry, status: Outcome["status"], reason?: string) {
  const [el] = entry.elements;
  if (!el) return;
  // A hidden control, such as a file input behind a button, is outlined
  // through its label, not through whichever ancestor shows, often the form.
  let target: HTMLElement | null =
    entry.kind === "radio"
      ? (el.closest<HTMLElement>('fieldset, [role="radiogroup"]') ??
        el.parentElement)
      : ([el, ...labelsOf(el), ...labelledBy(el)].find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && visible(node),
        ) ?? el);
  while (target && !visible(target)) target = target.parentElement;
  if (!target) return;
  target.style.outline = OUTLINES[status];
  target.style.outlineOffset = "2px";
  target.title =
    reason ??
    (status === "drafted"
      ? "Drafted by the assistant. Check it."
      : "Filled from your profile");
}

async function apply(
  fills: PageFill[],
  flags: PageFlag[],
  resume: PageResume | null,
): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  for (const { fieldId, value, drafted } of fills) {
    const entry = registry.get(fieldId);
    if (!entry) {
      outcomes.push({
        fieldId,
        status: "flagged",
        reason: "The page changed. Click Fill this page again.",
      });
      continue;
    }
    const reason = await fill(entry, value, resume);
    const status = reason ? "flagged" : drafted ? "drafted" : "filled";
    mark(entry, status, reason || undefined);
    outcomes.push({ fieldId, status, reason: reason || undefined });
  }
  for (const { fieldId, reason } of flags) {
    const entry = registry.get(fieldId);
    if (entry) mark(entry, "flagged", reason);
    outcomes.push({ fieldId, status: "flagged", reason });
  }
  return outcomes;
}

globalThis.jaaExtract = extract;
globalThis.jaaApply = apply;
