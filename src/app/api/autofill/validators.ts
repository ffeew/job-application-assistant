import { z } from "zod";
import { recordId } from "@/lib/validators/fields";
import {
  AUTOFILL_CLICK_LABEL_MAX,
  AUTOFILL_GROUP_LABEL_MAX,
  AUTOFILL_HISTORY_LINE_MAX,
  AUTOFILL_HISTORY_MAX,
  AUTOFILL_LABEL_MAX,
  AUTOFILL_MAX_CLICKABLES,
  AUTOFILL_MAX_FIELDS,
  AUTOFILL_MAX_OPTIONS,
  AUTOFILL_OPTION_MAX,
  AUTOFILL_PAGE_TEXT_MAX,
  AUTOFILL_URL_MAX,
  AUTOFILL_VALUE_MAX,
} from "./limits";
import { clickPurposes } from "./policy";

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
  autocomplete: z.string().max(200).optional(),
  label: z.string().max(AUTOFILL_LABEL_MAX),
  required: z.boolean(),
  maxLength: z.number().int().positive().optional(),
  options: z
    .array(z.string().max(AUTOFILL_OPTION_MAX))
    .max(AUTOFILL_MAX_OPTIONS)
    .optional(),
  section: z.string().max(AUTOFILL_GROUP_LABEL_MAX).optional(),
  // Whether the field holds an answer. Only answers the assistant wrote are
  // sent back as `value`; what the applicant typed stays on the page.
  filled: z.boolean(),
  value: z.string().max(AUTOFILL_VALUE_MAX).optional(),
});

export const autofillClickableSchema = z.object({
  id: z.string().min(1).max(50),
  purpose: z.enum(clickPurposes),
  label: z.string().max(AUTOFILL_CLICK_LABEL_MAX),
  section: z.string().max(AUTOFILL_GROUP_LABEL_MAX).optional(),
  question: z.string().max(AUTOFILL_LABEL_MAX).optional(),
});

// A review page or a step between two loads can have no fields.
export const autofillRequestSchema = z.object({
  url: z.string().max(AUTOFILL_URL_MAX),
  pageText: z.string().max(AUTOFILL_PAGE_TEXT_MAX),
  applicationId: recordId.optional(),
  fields: z.array(autofillFieldSchema).max(AUTOFILL_MAX_FIELDS),
  clickables: z.array(autofillClickableSchema).max(AUTOFILL_MAX_CLICKABLES),
  unfilledNotSent: z.number().int().nonnegative(),
  history: z
    .array(z.string().max(AUTOFILL_HISTORY_LINE_MAX))
    .max(AUTOFILL_HISTORY_MAX),
});

// No length limits: Claude's structured outputs reject maxLength, and the
// output token cap bounds the answer instead.
export const modelOutputSchema = z.object({
  fills: z.array(
    z.object({ fieldId: z.string(), value: z.string(), drafted: z.boolean() }),
  ),
  unanswered: z.array(z.object({ fieldId: z.string(), reason: z.string() })),
  click: z.object({ targetId: z.string() }).nullable(),
  status: z.enum(["continue", "handoff", "done"]),
  message: z.string(),
});

export const autofillResponseSchema = modelOutputSchema.extend({
  resumeId: z.string().nullable(),
});

export type AutofillField = z.infer<typeof autofillFieldSchema>;
export type AutofillClickable = z.infer<typeof autofillClickableSchema>;
export type AutofillRequest = z.infer<typeof autofillRequestSchema>;
export type ModelOutput = z.infer<typeof modelOutputSchema>;
export type AutofillResponse = z.infer<typeof autofillResponseSchema>;
