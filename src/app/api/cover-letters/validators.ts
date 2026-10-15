import { z } from "zod";
import {
  jobDescriptionText,
  longText,
  recordId,
  shortText,
} from "@/lib/validators/fields";
import { serializedTimestamps } from "@/lib/validators/transport";

export const coverLetterSchema = z.object({
  title: shortText.min(1, "Title is required"),
  content: longText.min(1, "Content is required"),
  isAiGenerated: z.boolean().default(false),
  jobApplicationId: recordId.optional(),
  resumeId: recordId.optional(),
});

export const createCoverLetterSchema = coverLetterSchema;

// Partial schemas keep field defaults, so an omitted key would overwrite the
// stored value on update. Defaulted fields are redeclared as plain optionals.
export const updateCoverLetterSchema = coverLetterSchema.partial().extend({
  isAiGenerated: z.boolean().optional(),
});

export const coverLetterResponseSchema = coverLetterSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const MAX_RESUME_CONTEXT_CHARS = 100_000;

export const generateCoverLetterSchema = z.object({
  company: shortText.min(1, "Company is required"),
  position: shortText.min(1, "Position is required"),
  jobDescription: jobDescriptionText.optional(),
  // Goes into the prompt as given, so its serialized size is what is bounded.
  resumeContent: z
    .unknown()
    .refine(
      (value) =>
        value === undefined ||
        JSON.stringify(value).length <= MAX_RESUME_CONTEXT_CHARS,
      "Resume content is too long to use for a cover letter",
    )
    .optional(),
  applicantName: shortText.optional(),
});

export const generateCoverLetterResponseSchema = z.object({
  coverLetter: z.string(),
  success: z.boolean(),
});

export type CreateCoverLetterRequest = z.infer<typeof createCoverLetterSchema>;
export type UpdateCoverLetterRequest = z.infer<typeof updateCoverLetterSchema>;
export type CoverLetterResponse = z.infer<typeof coverLetterResponseSchema>;

export const coverLetterJsonResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  isAiGenerated: z.boolean(),
  jobApplicationId: z.string().optional(),
  resumeId: z.string().optional(),
  ...serializedTimestamps,
});

export type CoverLetterJsonResponse = z.infer<
  typeof coverLetterJsonResponseSchema
>;
export type GenerateCoverLetterRequest = z.infer<
  typeof generateCoverLetterSchema
>;
export type GenerateCoverLetterResponse = z.infer<
  typeof generateCoverLetterResponseSchema
>;

export const coverLettersQuerySchema = z.object({
  isAiGenerated: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
  jobApplicationId: recordId.optional(),
  resumeId: recordId.optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional(),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().int().nonnegative())
    .optional(),
});

export type CoverLettersQuery = z.infer<typeof coverLettersQuerySchema>;
