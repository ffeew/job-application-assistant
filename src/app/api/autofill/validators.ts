import { z } from "zod";
import { recordId } from "@/lib/validators/fields";
import {
  AUTOFILL_LABEL_MAX,
  AUTOFILL_MAX_FIELDS,
  AUTOFILL_MAX_OPTIONS,
  AUTOFILL_OPTION_MAX,
  AUTOFILL_PAGE_TEXT_MAX,
  AUTOFILL_URL_MAX,
} from "./limits";

export const autofillFieldKinds = [
  "text",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "file",
  "combobox",
] as const;

export const autofillFieldSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.enum(autofillFieldKinds),
  inputType: z.string().max(30).optional(),
  label: z.string().max(AUTOFILL_LABEL_MAX),
  required: z.boolean(),
  maxLength: z.number().int().positive().optional(),
  options: z
    .array(z.string().max(AUTOFILL_OPTION_MAX))
    .max(AUTOFILL_MAX_OPTIONS)
    .optional(),
});

export const autofillRequestSchema = z.object({
  url: z.string().max(AUTOFILL_URL_MAX),
  pageText: z.string().max(AUTOFILL_PAGE_TEXT_MAX),
  applicationId: recordId.optional(),
  fields: z.array(autofillFieldSchema).min(1).max(AUTOFILL_MAX_FIELDS),
});

// No length limits: Claude's structured outputs reject maxLength, and the
// output token cap bounds the answer instead.
export const modelOutputSchema = z.object({
  fills: z.array(
    z.object({ fieldId: z.string(), value: z.string(), drafted: z.boolean() }),
  ),
  unanswered: z.array(z.object({ fieldId: z.string(), reason: z.string() })),
});

export const autofillResponseSchema = modelOutputSchema.extend({
  resumeId: z.string().nullable(),
});

export type AutofillField = z.infer<typeof autofillFieldSchema>;
export type AutofillRequest = z.infer<typeof autofillRequestSchema>;
export type ModelOutput = z.infer<typeof modelOutputSchema>;
export type AutofillResponse = z.infer<typeof autofillResponseSchema>;
