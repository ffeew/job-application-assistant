// Injected into every frame of the job page by the side panel. It uses no
// chrome.* APIs, so the E2E test can drive it the same way the panel does.
import {
  AUTOFILL_CLICK_LABEL_MAX,
  AUTOFILL_GROUP_LABEL_MAX,
  AUTOFILL_LABEL_MAX,
  AUTOFILL_MAX_CHOICES,
  AUTOFILL_MAX_CLICKABLES,
  AUTOFILL_MAX_FIELDS,
  AUTOFILL_MAX_OPTIONS,
  AUTOFILL_OPTION_MAX,
  AUTOFILL_PAGE_TEXT_MAX,
  AUTOFILL_VALUE_MAX,
} from "@/app/api/autofill/limits";
import {
  clickRefusal,
  labelPurpose,
  type ClickPurpose,
} from "@/app/api/autofill/policy";
import type {
  AutofillClickable,
  AutofillField,
} from "@/app/api/autofill/validators";

type Kind = AutofillField["kind"];

export interface Extracted {
  origin: string;
  pageText: string;
  fields: AutofillField[];
  clickables: AutofillClickable[];
  /** Unfilled fields left out because the page has too many. */
  unfilledNotSent: number;
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
  /** "kept": the field held the applicant's answer, so it was left alone. */
  status: "filled" | "drafted" | "flagged" | "kept";
  reason?: string;
}

declare global {
  var jaaExtract: () => Extracted;
  var jaaApply: (
    fills: PageFill[],
    flags: PageFlag[],
    resume: PageResume | null,
  ) => Promise<Outcome[]>;
  var jaaClick: (id: string, label: string) => string | null;
  var jaaHandOver: (fieldIds: string[]) => void;
  var jaaSettle: () => Promise<void>;
  var jaaShape: () => string;
  var jaaState: () => string;
  // Each injection re-runs this script, but globals last as long as the
  // document, so what the assistant wrote is remembered across steps.
  var jaaWritten: WeakMap<Element, string> | undefined;
  var jaaYours: WeakSet<Element> | undefined;
  var jaaStop: boolean | undefined;
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
// Buttons, disclosure toggles and options of an open list. Combobox fields are
// offered from the fields, to be opened.
const CLICKABLE =
  'button, input[type="submit"], input[type="button"], [role="button"], summary, [aria-expanded="false"], [role="option"]';
// Site navigation and result paging also say "Next". A plain <header> is not
// excluded: form sections use them for their titles and toggles.
const OFF_FORM =
  'nav, [role="navigation"], [role="banner"], [aria-label*="pagination" i]';
const HEADINGS = 'h1, h2, h3, h4, h5, h6, [role="heading"], legend';
const PLACEHOLDER =
  /^(select|choose|please|make a selection|search|none selected|--|—)/i;
const COMBOBOX_WAIT_MS = 1_000;
const SETTLE_QUIET_MS = 500;
const SETTLE_MAX_MS = 10_000;
// A step that loads by XHR can sit still behind a spinner.
const BUSY = '[aria-busy="true"], [role="progressbar"]';
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
interface Click {
  el: HTMLElement;
  purpose: ClickPurpose;
  label: string;
  section?: string;
  question?: string;
}
interface OpenList {
  combobox: HTMLElement;
  listbox: Element;
}
const registry = new Map<string, Entry>();
const clicks = new Map<string, Click>();
const written = (globalThis.jaaWritten ??= new WeakMap<Element, string>());
const yours = (globalThis.jaaYours ??= new WeakSet<Element>());

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

function collect(
  root: Document | ShadowRoot,
  selector: string,
  found: HTMLElement[],
) {
  for (const el of root.querySelectorAll("*")) {
    if (el instanceof HTMLElement && el.matches(selector)) found.push(el);
    if (el.shadowRoot) collect(el.shadowRoot, selector, found);
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

/** The label a field is sent with: its own name, after its question. */
function fieldLabel(el: HTMLElement, kind: Kind): string {
  const own = ownLabel(el);
  const question =
    kind === "checkbox" || !own ? questionOf(el, own ? [own] : []) : "";
  return label(question, own);
}

/** The nearest heading or legend before the element, such as "Work Experience 2". */
function sectionOf(el: Element): string {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const before = Array.from(node.querySelectorAll(HEADINGS)).filter(
      (heading) =>
        !heading.contains(el) &&
        Boolean(
          heading.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
    const nearest = before.at(-1);
    if (nearest) return textOf(nearest).slice(0, AUTOFILL_GROUP_LABEL_MAX);
  }
  return "";
}

/** The answer a field shows now, or "" when it shows none. */
function currentValue(entry: Entry): string {
  const [el] = entry.elements;
  if (!el) return "";
  switch (entry.kind) {
    case "text":
    case "textarea":
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el.value
        : "";
    case "select": {
      const option =
        el instanceof HTMLSelectElement ? el.selectedOptions[0] : undefined;
      if (
        !option ||
        option.disabled ||
        option.value === "" ||
        (option.index === 0 && PLACEHOLDER.test(clean(option.text)))
      ) {
        return "";
      }
      return clean(option.text);
    }
    case "radio": {
      const index = entry.elements.findIndex(checked);
      return index === -1 ? "" : (entry.options[index] ?? "");
    }
    case "checkbox":
      return checked(el) ? "true" : "";
    case "file":
      return el instanceof HTMLInputElement ? (el.files?.[0]?.name ?? "") : "";
    case "combobox": {
      if (el instanceof HTMLInputElement) return el.value;
      if (el.hasAttribute("data-placeholder")) return "";
      const shown = textOf(el);
      return PLACEHOLDER.test(shown) ? "" : shown;
    }
  }
}

function openList(): OpenList | null {
  const combobox = document.querySelector<HTMLElement>(
    '[aria-expanded="true"]:is([role="combobox"], [aria-haspopup="listbox"])',
  );
  const listbox = combobox ? listboxFor(combobox, new Set()) : null;
  return combobox && listbox ? { combobox, listbox } : null;
}

function submitsForm(el: HTMLElement): boolean {
  return (
    (el instanceof HTMLButtonElement && el.type === "submit" && !!el.form) ||
    (el instanceof HTMLInputElement &&
      (el.type === "submit" || el.type === "image"))
  );
}

function buttonLabel(el: HTMLElement): string {
  return (
    ariaLabel(el) ||
    textOf(el) ||
    (el instanceof HTMLInputElement ? clean(el.value) : "") ||
    clean(el.getAttribute("title"))
  );
}

/**
 * What a click on the element would do, read from its structure and name.
 * Elements that match no allowed purpose are never offered or clicked.
 */
function purposeOf(
  el: HTMLElement,
  list: OpenList | null,
): ClickPurpose | null {
  if (
    el.matches(':disabled, [aria-disabled="true"]') ||
    el.closest('[aria-hidden="true"]') ||
    el.closest(OFF_FORM) ||
    !visible(el)
  ) {
    return null;
  }
  if (el.matches('[role="option"]')) {
    return list?.listbox.contains(el) ? "choose_option" : null;
  }
  if (kindOf(el) === "combobox") {
    return el.getAttribute("aria-expanded") === "true" ? null : "open_list";
  }
  let purpose: ClickPurpose | null = null;
  if (el.tagName === "SUMMARY") {
    const details = el.parentElement;
    purpose =
      details instanceof HTMLDetailsElement && !details.open ? "expand" : null;
  } else if (el.getAttribute("aria-expanded") === "false") {
    purpose = "expand";
  } else if (
    el.matches(
      'button, input[type="submit"], input[type="button"], [role="button"]',
    )
  ) {
    purpose = labelPurpose(buttonLabel(el));
    if (purpose === "save_entry" && !el.closest('[role="dialog"], dialog')) {
      purpose = null;
    }
  }
  // Moving to the next step may post the form; nothing else should.
  return purpose && purpose !== "next" && submitsForm(el) ? null : purpose;
}

function describeClick(el: HTMLElement, list: OpenList | null): Click | null {
  const purpose = purposeOf(el, list);
  if (!purpose) return null;
  const name =
    purpose === "open_list"
      ? fieldLabel(el, "combobox")
      : purpose === "choose_option"
        ? textOf(el)
        : buttonLabel(el);
  return {
    el,
    purpose,
    label: name.slice(0, AUTOFILL_CLICK_LABEL_MAX),
    section: sectionOf(el) || undefined,
    question:
      purpose === "open_list"
        ? name
        : purpose === "choose_option" && list
          ? fieldLabel(list.combobox, "combobox")
          : undefined,
  };
}

const CLICK_ORDER: Record<ClickPurpose, number> = {
  next: 0,
  save_entry: 0,
  add_entry: 1,
  expand: 2,
  open_list: 3,
  choose_option: 4,
};

interface Read {
  items: { field: AutofillField; entry: Entry }[];
  offered: Click[];
}

/** Reads the page without changing the registries, so it can be polled. */
function read(): Read {
  const found: HTMLElement[] = [];
  collect(document, CONTROLS, found);

  const items: Read["items"] = [];
  const groups = new Map<Node, Map<string, Entry>>();
  const add = (entry: Entry, field: Omit<AutofillField, "id" | "filled">) => {
    items.push({
      entry,
      field: { id: String(items.length), filled: false, ...field },
    });
  };

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
      add(entry, { label: "", required: isRequired(el), kind });
      continue;
    }

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
    add(entry, {
      kind,
      label: fieldLabel(el, kind),
      required: isRequired(el),
      inputType: el instanceof HTMLInputElement ? el.type : undefined,
      maxLength: entry.maxLength,
    });
  }

  const offered: Click[] = [];
  const list = openList();
  for (const { field, entry } of items) {
    const [first] = entry.elements;
    if (!first) continue;
    // Radio groups learn their question once every option is known.
    if (entry.kind === "radio") {
      field.label = questionOf(first, entry.options).slice(
        0,
        AUTOFILL_LABEL_MAX,
      );
      field.required = entry.elements.some(isRequired);
    }
    if (entry.kind === "select" || entry.kind === "radio") {
      // Large lists, such as countries, are matched here after the model
      // names a value, so they don't fill the prompt. A placeholder such as
      // "Select…" has no value and is no answer.
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
    field.section = sectionOf(first) || undefined;
    const own = yours.has(first) ? undefined : written.get(first);
    field.filled =
      own !== undefined || yours.has(first) || currentValue(entry) !== "";
    if (own !== undefined) {
      field.value = (entry.kind === "checkbox" ? own || "false" : own).slice(
        0,
        AUTOFILL_VALUE_MAX,
      );
    }
    if (entry.kind === "combobox" && !field.filled) {
      const click = describeClick(first, list);
      if (click) offered.push(click);
    }
  }

  const buttons: HTMLElement[] = [];
  collect(document, CLICKABLE, buttons);
  for (const el of buttons) {
    if (kindOf(el) === "combobox") continue;
    const click = describeClick(el, list);
    if (click) offered.push(click);
  }
  offered.sort((a, b) => CLICK_ORDER[a.purpose] - CLICK_ORDER[b.purpose]);
  const choices = offered.filter((click) => click.purpose === "choose_option");
  const dropped = new Set(choices.slice(AUTOFILL_MAX_CHOICES));
  return {
    items,
    offered: offered
      .filter((click) => !dropped.has(click))
      .slice(0, AUTOFILL_MAX_CLICKABLES),
  };
}

function extract(): Extracted {
  const { items, offered } = read();
  registry.clear();
  clicks.clear();
  for (const { field, entry } of items) registry.set(field.id, entry);
  offered.forEach((click, index) => clicks.set(`c${String(index)}`, click));

  // Answered fields go first when the page has too many, so questions further
  // down a long page are still seen.
  let fields = items.map(({ field }) => field);
  let unfilledNotSent = 0;
  if (fields.length > AUTOFILL_MAX_FIELDS) {
    const sent = new Set(
      [
        ...fields.filter((field) => !field.filled),
        ...fields.filter((field) => field.filled),
      ].slice(0, AUTOFILL_MAX_FIELDS),
    );
    unfilledNotSent = fields.filter(
      (field) => !field.filled && !sent.has(field),
    ).length;
    fields = fields.filter((field) => sent.has(field));
  }

  // Validation messages lead, so the length cap never cuts them.
  const alerts = [
    ...Array.from(document.querySelectorAll('[role="alert"]'), textOf),
    ...items
      .filter(({ entry }) =>
        entry.elements.some((el) => el.getAttribute("aria-invalid") === "true"),
      )
      .map(({ field }) => `Check: ${field.label}`),
  ].filter(Boolean);
  return {
    origin: location.origin,
    pageText: [...alerts, clean(document.body.innerText)]
      .join("\n")
      .slice(0, AUTOFILL_PAGE_TEXT_MAX),
    fields,
    clickables: [...clicks].map(([id, click]) => ({
      id,
      purpose: click.purpose,
      label: click.label,
      section: click.section,
      question: click.question,
    })),
    unfilledNotSent,
  };
}

/** The questions on the page, in order; new ones mean an answer revealed more. */
function shape(items: Read["items"]): string {
  return JSON.stringify(
    items.map(({ field }) => `${field.section ?? ""}›${field.label}`),
  );
}

/** Everything a step can change; when it stays the same, the step did nothing. */
function state(): string {
  const { items, offered } = read();
  return JSON.stringify([
    location.href,
    shape(items),
    items.map(({ field }) => field.filled),
    offered.map((click) => `${click.purpose}:${click.label}`),
  ]);
}

/** Waits until the page has been still for a moment and shows no spinner. */
function settle(): Promise<void> {
  return new Promise((done) => {
    const finish = () => {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(cap);
      done();
    };
    const idle = () => {
      if (Array.from(document.querySelectorAll(BUSY)).some(visible)) {
        quiet = setTimeout(idle, SETTLE_QUIET_MS);
      } else {
        finish();
      }
    };
    let quiet = setTimeout(idle, SETTLE_QUIET_MS);
    const cap = setTimeout(finish, SETTLE_MAX_MS);
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(idle, SETTLE_QUIET_MS);
    });
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
}

/**
 * Clicks an offered element after checking it again as it is now. Returns ""
 * once clicked, why it was refused, or null when the page changed under it.
 */
function click(id: string, offeredLabel: string): string | null {
  const offered = clicks.get(id);
  if (!offered?.el.isConnected) return null;
  const now = describeClick(offered.el, openList());
  if (now?.purpose !== offered.purpose || now.label !== offeredLabel) {
    return null;
  }
  const refused = clickRefusal(now);
  if (refused) return refused;
  now.el.click();
  return "";
}

/** Fields the applicant was asked to answer are theirs from then on. */
function handOver(fieldIds: string[]) {
  for (const id of fieldIds) {
    const el = registry.get(id)?.elements[0];
    if (el) yours.add(el);
  }
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

/**
 * The assistant may change a field only while it is empty or still holds what
 * the assistant wrote, so an answer the applicant gave, before the run or
 * during a pause, cleared or unticked included, stays.
 */
function mayWrite(entry: Entry, el: HTMLElement): boolean {
  return !yours.has(el) && currentValue(entry) === (written.get(el) ?? "");
}

async function fill(
  entry: Entry,
  value: string,
  resume: PageResume | null,
): Promise<string> {
  const [el] = entry.elements;
  if (!el || entry.elements.some((node) => !node.isConnected)) {
    return "The page changed. Click Continue.";
  }
  const before = currentValue(entry);
  const reason = await write(entry, el, value, resume);
  const after = currentValue(entry);
  // A failed attempt that changed the field, such as a reformatted phone
  // number, is still the assistant's to correct.
  if (!reason || after !== before) written.set(el, after);
  return reason;
}

async function write(
  entry: Entry,
  el: HTMLElement,
  value: string,
  resume: PageResume | null,
): Promise<string> {
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

function mark(entry: Entry, status: keyof typeof OUTLINES, reason?: string) {
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
  globalThis.jaaStop = false;
  // Set by the panel's Stop button while a slow list is being filled; read
  // through a call, since TypeScript keeps the `false` above across awaits.
  const stopped = () => globalThis.jaaStop === true;
  const outcomes: Outcome[] = [];
  for (const { fieldId, value, drafted } of fills) {
    if (stopped()) return outcomes;
    const entry = registry.get(fieldId);
    if (!entry) {
      outcomes.push({
        fieldId,
        status: "flagged",
        reason: "The page changed. Click Continue.",
      });
      continue;
    }
    const [el] = entry.elements;
    if (el?.isConnected && !mayWrite(entry, el)) {
      yours.add(el);
      const reason = "You answered this, so it was left as it is.";
      mark(entry, "flagged", reason);
      outcomes.push({ fieldId, status: "kept", reason });
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
globalThis.jaaClick = click;
globalThis.jaaHandOver = handOver;
globalThis.jaaSettle = settle;
globalThis.jaaShape = () => shape(read().items);
globalThis.jaaState = state;
