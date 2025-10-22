import { z } from "zod";

// Base cover letter schema
export const coverLetterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  isAiGenerated: z.boolean().default(false),
  jobApplicationId: z.string().optional(),
  resumeId: z.string().optional(),
});

// Create cover letter request
export const createCoverLetterSchema = coverLetterSchema;

// Update cover letter request
export const updateCoverLetterSchema = coverLetterSchema.partial();

// Cover letter response with database fields
export const coverLetterResponseSchema = coverLetterSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Generate cover letter request
export const generateCoverLetterSchema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  jobDescription: z.string().optional(),
  resumeContent: z.any().optional(), // Can be parsed JSON object
  applicantName: z.string().optional(),
});

// Generate cover letter response
export const generateCoverLetterResponseSchema = z.object({
  coverLetter: z.string(),
  success: z.boolean(),
});

// Infer types for use throughout the application
export type CreateCoverLetterRequest = z.infer<typeof createCoverLetterSchema>;
export type UpdateCoverLetterRequest = z.infer<typeof updateCoverLetterSchema>;
export type CoverLetterResponse = z.infer<typeof coverLetterResponseSchema>;
export type GenerateCoverLetterRequest = z.infer<typeof generateCoverLetterSchema>;
export type GenerateCoverLetterResponse = z.infer<typeof generateCoverLetterResponseSchema>;

// Query parameters for filtering
export const coverLettersQuerySchema = z.object({
  isAiGenerated: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
  jobApplicationId: z.string().optional(),
  resumeId: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
});

export type CoverLettersQuery = z.infer<typeof coverLettersQuerySchema>;