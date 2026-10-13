import { z } from "zod";

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

export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["application", "resume", "cover_letter"]),
  action: z.enum(["created", "updated", "deleted"]),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

export const dashboardActivitySchema = z.array(activityItemSchema);

export const activityQuerySchema = z.object({
  type: z.enum(["application", "resume", "cover_letter"]).optional(),
  limit: z.string().optional().default("10").transform(Number).pipe(z.number().int().positive().max(50)),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type DashboardActivity = z.infer<typeof dashboardActivitySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;