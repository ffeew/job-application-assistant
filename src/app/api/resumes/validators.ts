import { z } from "zod";

// Base resume schema
export const resumeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"), // JSON string
  isDefault: z.boolean().default(false),
  jobApplicationId: z.string().optional(), // For tailored resumes linked to job applications
  isTailored: z.boolean().default(false),
});

// Create resume request
export const createResumeSchema = resumeSchema;

// Update resume request
export const updateResumeSchema = resumeSchema.partial();

// Resume response with database fields
export const resumeResponseSchema = resumeSchema.extend({
  id: z.string(),
  userId: z.string(),
  jobApplicationId: z.string().nullable().optional(),
  isTailored: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Infer types for use throughout the application
export type CreateResumeRequest = z.infer<typeof createResumeSchema>;
export type UpdateResumeRequest = z.infer<typeof updateResumeSchema>;
export type ResumeResponse = z.infer<typeof resumeResponseSchema>;

// Query parameters for filtering
export const resumesQuerySchema = z.object({
  isDefault: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
  isTailored: z.string().transform((val) => val === 'true').pipe(z.boolean()).optional(),
  jobApplicationId: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
});

export type ResumesQuery = z.infer<typeof resumesQuerySchema>;