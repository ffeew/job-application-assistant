import { z } from "zod";
import { MONTH_PATTERN } from "@/lib/month";

// Every stored text has a ceiling: these values are sent to the model, typeset
// by the compiler and returned in list responses, so none may grow without bound.
export const SHORT_TEXT_MAX = 300;
export const LONG_TEXT_MAX = 20_000;
export const JOB_DESCRIPTION_MAX = 50_000;
const URL_MAX = 2_000;

const tooLong = (max: number) =>
  `Keep this under ${max.toLocaleString("en-US")} characters`;

export const shortText = z.string().max(SHORT_TEXT_MAX, tooLong(SHORT_TEXT_MAX));
export const longText = z.string().max(LONG_TEXT_MAX, tooLong(LONG_TEXT_MAX));
export const documentText = z.string().max(1_000_000, "This document is too large to save");
export const recordId = z.string().min(1).max(100);
export const jobDescriptionText = z
  .string()
  .max(JOB_DESCRIPTION_MAX, tooLong(JOB_DESCRIPTION_MAX));

// A cleared form input submits "", which would fail the format check on a field
// that is allowed to be absent. Blank optional values are stored as null.
const blankToNull = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
const nullableText = z
  .string()
  .max(URL_MAX, tooLong(URL_MAX))
  .nullable()
  .transform(blankToNull);

export const monthSchema = z
  .string()
  .regex(MONTH_PATTERN, "Date must be in YYYY-MM format");

export const optionalMonth = nullableText.pipe(monthSchema.nullable());

export const optionalEmail = nullableText.pipe(
  z.email({ message: "Invalid email format" }).nullable(),
);

/**
 * Links are rendered as anchors and typeset into PDFs, so only web addresses
 * are accepted: `javascript:` and `file:` are valid URLs too.
 */
export const httpUrl = z.url({
  protocol: /^https?$/,
  message: "Enter a link starting with https://",
});

export const optionalUrl = nullableText.pipe(httpUrl.nullable());

export function normalizeHttpUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  const parsed = httpUrl.safeParse(candidate);
  if (!parsed.success) return null;
  try {
    return new URL(parsed.data).toString();
  } catch {
    return null;
  }
}
