// What the assistant may answer and click, enforced in code because labels and
// page text are written by the site and the model only follows a prompt. The
// server checks every decision, and the page script checks each click again on
// the live element. Kept free of Zod so the page script can import it.
import type { AutofillField } from "./validators";

export const clickPurposes = [
  "next",
  "add_entry",
  "expand",
  "save_entry",
  "open_list",
  "choose_option",
] as const;
export type ClickPurpose = (typeof clickPurposes)[number];

// Clicks are allowed by purpose, never by the absence of a bad word, so an
// unnamed, icon-only or foreign-language button is never pressed. A final
// "Submit" or "Apply" is never offered: the applicant submits.
const NEXT_LABEL =
  /^(next( step| page)?|continue|save (and|&) continue|save and next|proceed)$/i;
const ADD_LABEL = /^\+?\s*add\b/i;
const SAVE_ENTRY_LABEL = /^(save|done)$/i;
const BLOCKED_LABEL =
  /submit|send|finish|complete|confirm|\bapply\b|delete|remove|withdraw|cancel|discard|clear|reset|start over|sign ?(in|up|out)|log ?(in|out)|register|create account|accept|agree/i;

// Any answer to these is refused, even "false", which would untick a box the
// applicant ticked. Consent is given by choosing, so "Confirm email" text is
// not read for it; "certif" and "accept" also name ordinary questions ("PMP
// certification?"), so they only count on checkboxes.
const CHOICE_KINDS = new Set<AutofillField["kind"]>([
  "checkbox",
  "radio",
  "select",
  "combobox",
]);
const CONSENT_LABEL =
  /agree|certify|consent|acknowledg|confirm|declar|authori[sz]e\b|i have read|terms|privacy|signature|attest/i;
const CHECKBOX_CONSENT_LABEL = /certif|accept/i;
const APPLICANT_ONLY_LABEL =
  /gender|sexual orientation|\brace\b|ethnic|hispanic|latin[oax]|veteran|disabilit|religio|marital|nationality|date of birth|\bdob\b|\bnric\b|sponsor|\bvisa\b|citizen|authori[sz]ed to work|work authori[sz]ation|eligible to work|work permit|right to work|salary|compensation|\bpay\b|\bctc\b|signature/i;

export function authenticationRefusal(
  label: string,
  inputType = "",
  autocomplete = "",
): string {
  return inputType === "password" ||
    /(?:^|\s)(?:current-password|new-password|one-time-code|username)(?:\s|$)/i.test(
      autocomplete,
    ) ||
    /password|verification code|security code|authentication code|one.time (?:code|password)|\botp\b|\bcaptcha\b|\bsign[ -]?in\b|\blog[ -]?in\b|\bcreate (?:an? )?account\b/i.test(
      label,
    )
    ? "Complete sign-in or verification yourself, then click Continue."
    : "";
}

/** A button's name without the arrows and punctuation around it, as "Next →". */
export const trimLabel = (label: string) =>
  label.replace(/^[^\p{L}\p{N}+]+|[^\p{L}\p{N}]+$/gu, "");

/** The purpose a button's name gives it, or null when it has none allowed. */
export function labelPurpose(
  label: string,
): "next" | "add_entry" | "save_entry" | null {
  const name = trimLabel(label);
  if (!name || BLOCKED_LABEL.test(name)) return null;
  if (NEXT_LABEL.test(name)) return "next";
  if (ADD_LABEL.test(name)) return "add_entry";
  if (SAVE_ENTRY_LABEL.test(name)) return "save_entry";
  return null;
}

/**
 * Why only the applicant may answer this question, or "" when the assistant
 * may. Section context also names otherwise vague fields such as "Expected
 * amount" under "Compensation".
 */
export function answerRefusal(
  kind: AutofillField["kind"],
  label: string,
  section = "",
  inputType = "",
  autocomplete = "",
): string {
  const choice = CHOICE_KINDS.has(kind);
  // Visa can be an employer's name in a heading; typed fields need a
  // qualified visa context, while an explicitly labelled visa field is refused.
  const context = choice
    ? section
    : section.replace(
        /\bvisa\b(?!\s+(?:status|sponsorship|requirements?|type|information)\b)/gi,
        "",
      );
  const question = context ? `${context} › ${label}` : label;
  const authentication = authenticationRefusal(
    question,
    inputType,
    autocomplete,
  );
  if (authentication) return authentication;
  if (
    choice &&
    (CONSENT_LABEL.test(question) ||
      (kind === "checkbox" && CHECKBOX_CONSENT_LABEL.test(question)))
  ) {
    return "Read and confirm this yourself";
  }
  return APPLICANT_ONLY_LABEL.test(question) ||
    /\breferences?\b/i.test(question)
    ? "Answer this yourself"
    : "";
}

export interface ClickTarget {
  purpose: ClickPurpose;
  label: string;
  section?: string;
  /** For lists, the question the list answers. */
  question?: string;
}

/** Why this click is refused, or "" when it is allowed. */
export function clickRefusal(target: ClickTarget): string {
  const name = trimLabel(target.label);
  if (!name) return "It has no name, so it isn't clicked.";
  if (BLOCKED_LABEL.test(name))
    return `Click "${name}" yourself if it's needed.`;
  switch (target.purpose) {
    case "next":
    case "add_entry":
    case "save_entry":
      return labelPurpose(name) === target.purpose
        ? ""
        : `Click "${name}" yourself if it's needed.`;
    case "expand":
      return "";
    case "open_list":
    case "choose_option":
      return answerRefusal(
        "combobox",
        target.question ? `${target.question} › ${target.label}` : target.label,
        target.section,
      );
  }
}
