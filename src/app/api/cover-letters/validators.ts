import { z } from "zod";
import { serializedTimestamps } from "@/lib/validators/transport";

export const coverLetterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  isAiGenerated: z.boolean().default(false),
  jobApplicationId: z.string().optional(),
  resumeId: z.string().optional(),
});

export const createCoverLetterSchema = coverLetterSchema;

export const updateCoverLetterSchema = coverLetterSchema.partial();

export const coverLetterResponseSchema = coverLetterSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const generateCoverLetterSchema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  jobDescription: z.string().optional(),
  resumeContent: z.unknown().optional(),
  applicantName: z.string().optional(),
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

export type CoverLetterJsonResponse = z.infer<typeof coverLetterJsonResponseSchema>;
export type GenerateCoverLetterRequest = z.infer<typeof generateCoverLetterSchema>;
export type GenerateCoverLetterResponse = z.infer<typeof generateCoverLetterResponseSchema>;

export const coverLettersQuerySchema = z.object({
  isAiGenerated: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
  jobApplicationId: z.string().optional(),
  resumeId: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
});

export type CoverLettersQuery = z.infer<typeof coverLettersQuerySchema>;
