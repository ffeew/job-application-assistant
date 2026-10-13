import { z } from "zod";
import { documentText, recordId, shortText } from "@/lib/validators/fields";
import { serializedTimestamps } from "@/lib/validators/transport";

export const resumeSchema = z.object({
  title: shortText.min(1, "Title is required"),
  content: documentText.min(1, "Content is required"),
  isDefault: z.boolean().default(false),
  jobApplicationId: recordId.optional(),
  isTailored: z.boolean().default(false),
});

export const createResumeSchema = resumeSchema;

// Partial schemas keep field defaults, so an omitted key would overwrite the
// stored value on update. Defaulted fields are redeclared as plain optionals.
export const updateResumeSchema = resumeSchema.partial().extend({
  isDefault: z.boolean().optional(),
  isTailored: z.boolean().optional(),
});

export const resumeResponseSchema = resumeSchema.extend({
  id: z.string(),
  userId: z.string(),
  jobApplicationId: z.string().nullable().optional(),
  isTailored: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateResumeRequest = z.infer<typeof createResumeSchema>;
export type UpdateResumeRequest = z.infer<typeof updateResumeSchema>;
export type ResumeResponse = z.infer<typeof resumeResponseSchema>;

export const resumeJsonResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  isDefault: z.boolean(),
  jobApplicationId: z.string().nullable().optional(),
  isTailored: z.boolean(),
  ...serializedTimestamps,
});

export type ResumeJsonResponse = z.infer<typeof resumeJsonResponseSchema>;

export const resumesQuerySchema = z.object({
  isDefault: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
  isTailored: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
  jobApplicationId: recordId.optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
});

export type ResumesQuery = z.infer<typeof resumesQuerySchema>;
