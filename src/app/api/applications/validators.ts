import { z } from "zod";

// Base application schema
export const applicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  jobDescription: z.string().optional(),
  location: z.string().optional(),
  jobUrl: z.string().url("Invalid job URL").optional().or(z.literal("")),
  salaryRange: z.string().optional(),
  status: z.enum(["applied", "interviewing", "offer", "rejected", "withdrawn"]).default("applied"),
  appliedAt: z.string().optional(),
  notes: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactName: z.string().optional(),
  recruiterId: z.string().optional(),
});

// Create application request
export const createApplicationSchema = applicationSchema;

// Update application request
export const updateApplicationSchema = applicationSchema.partial();

// Application response with database fields
export const applicationResponseSchema = applicationSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  appliedAt: z.date().optional(),
});

// Infer types for use throughout the application
export type CreateApplicationRequest = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationRequest = z.infer<typeof updateApplicationSchema>;
export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;

// Query parameters for filtering/pagination
export const applicationsQuerySchema = z.object({
  status: z.enum(["applied", "interviewing", "offer", "rejected", "withdrawn"]).optional(),
  company: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
});

export type ApplicationsQuery = z.infer<typeof applicationsQuerySchema>;