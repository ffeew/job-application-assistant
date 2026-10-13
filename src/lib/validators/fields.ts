import { z } from "zod";
import { MONTH_PATTERN } from "@/lib/month";

// A cleared form input submits "", which would fail the format check on a field
// that is allowed to be absent. Blank optional values are stored as null.
const blankToNull = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
const nullableText = z.string().nullable().transform(blankToNull);

export const monthSchema = z
  .string()
  .regex(MONTH_PATTERN, "Date must be in YYYY-MM format");

export const optionalMonth = nullableText.pipe(monthSchema.nullable());

export const optionalEmail = nullableText.pipe(
  z.email({ message: "Invalid email format" }).nullable(),
);

export const optionalUrl = nullableText.pipe(
  z.url({ message: "Invalid URL format" }).nullable(),
);
