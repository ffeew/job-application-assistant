import { z } from "zod";
import {
  httpUrl,
  jobDescriptionText,
  longText,
  shortText,
} from "@/lib/validators/fields";
import { serializedTimestamps } from "@/lib/validators/transport";

export const applicationSchema = z.object({
  company: shortText.min(1, "Company is required"),
  position: shortText.min(1, "Position is required"),
  jobDescription: jobDescriptionText.optional(),
  location: shortText.optional(),
  jobUrl: httpUrl.max(2000).optional().or(z.literal("")),
  salaryRange: shortText.optional(),
  status: z.enum(["applied", "interviewing", "offer", "rejected", "withdrawn"]).default("applied"),
  // A date input submits YYYY-MM-DD, or "" once it has been cleared.
  appliedAt: z
    .union([z.literal(""), z.iso.date(), z.iso.datetime()], {
      error: "Enter a valid date",
    })
    .optional(),
  notes: longText.optional(),
  contactEmail: z.email("Invalid email").max(320).optional().or(z.literal("")),
  contactName: shortText.optional(),
  recruiterId: shortText.optional(),
});

export const createApplicationSchema = applicationSchema;

// Partial schemas keep field defaults, so an omitted key would overwrite the
// stored value on update. Defaulted fields are redeclared as plain optionals.
export const updateApplicationSchema = applicationSchema.partial().extend({
  status: applicationSchema.shape.status.unwrap().optional(),
});

export const applicationResponseSchema = applicationSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  appliedAt: z.date().optional(),
});

export type CreateApplicationRequest = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationRequest = z.infer<typeof updateApplicationSchema>;
export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;

// Persisted values may predate form constraints; validate only their wire shape.
export const applicationJsonResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  company: z.string(),
  position: z.string(),
  jobDescription: z.string().optional(),
  location: z.string().optional(),
  jobUrl: z.string().optional(),
  salaryRange: z.string().optional(),
  status: applicationSchema.shape.status.unwrap(),
  appliedAt: z.iso.datetime().optional(),
  notes: z.string().optional(),
  contactEmail: z.string().optional(),
  contactName: z.string().optional(),
  recruiterId: z.string().optional(),
  ...serializedTimestamps,
});

export type ApplicationJsonResponse = z.infer<typeof applicationJsonResponseSchema>;

export const applicationsQuerySchema = z.object({
  status: z.enum(["applied", "interviewing", "offer", "rejected", "withdrawn"]).optional(),
  company: shortText.optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
});

export type ApplicationsQuery = z.infer<typeof applicationsQuerySchema>;
