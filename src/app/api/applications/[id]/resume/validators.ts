import { z } from "zod";
import { intelligentContentSelectionSchema } from "@/app/api/profile/validators";

export const applicationResumeInfoResponseSchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  jobDescription: z.string().optional(),
  hasJobDescription: z.boolean(),
  location: z.string().optional(),
  status: z.string(),
  tailoredResume: z.object({
    id: z.string(),
    title: z.string(),
    updatedAt: z.iso.datetime(),
  }).nullable(),
});

export const jobApplicationResumeResponseSchema = z.object({
  html: z.string(),
  aiSelection: intelligentContentSelectionSchema.optional(),
  application: z.object({
    id: z.string(),
    company: z.string(),
    position: z.string(),
  }),
});

export const saveTailoredResumeRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export const saveTailoredResumeResponseSchema = z.object({
  success: z.literal(true),
  resume: z.object({
    id: z.string(),
    title: z.string(),
    isTailored: z.boolean(),
    jobApplicationId: z.string(),
    updatedAt: z.iso.datetime(),
  }),
  isNew: z.boolean(),
});

export type ApplicationResumeInfoResponse = z.infer<typeof applicationResumeInfoResponseSchema>;
export type JobApplicationResumeResponse = z.infer<typeof jobApplicationResumeResponseSchema>;
export type SaveTailoredResumeRequest = z.infer<typeof saveTailoredResumeRequestSchema>;
export type SaveTailoredResumeResponse = z.infer<typeof saveTailoredResumeResponseSchema>;
