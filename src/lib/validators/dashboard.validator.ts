import { z } from "zod";

// Dashboard stats response
export const dashboardStatsSchema = z.object({
  totalApplications: z.number(),
  totalResumes: z.number(),
  totalCoverLetters: z.number(),
  applicationsByStatus: z.object({
    applied: z.number(),
    interviewing: z.number(),
    offer: z.number(),
    rejected: z.number(),
    withdrawn: z.number(),
  }),
});

// Dashboard activity item
export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["application", "resume", "cover_letter"]),
  action: z.enum(["created", "updated", "deleted"]),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string(), // ISO 8601 date string from JSON serialization
});

// Dashboard activity response
export const dashboardActivitySchema = z.array(activityItemSchema);

// Query parameters for activity
export const activityQuerySchema = z.object({
  type: z.enum(["application", "resume", "cover_letter"]).optional(),
  limit: z.string().optional().default("10").transform(Number).pipe(z.number().positive().max(50)),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
});

// Infer types for use throughout the application
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type DashboardActivity = z.infer<typeof dashboardActivitySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;