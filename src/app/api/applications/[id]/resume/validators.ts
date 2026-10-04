import { z } from "zod";
import {
  generatedResumeResultSchema,
  savedGeneratedResumeSchema,
} from "@/lib/resume-document";

export const applicationResumeInfoResponseSchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  jobDescription: z.string().optional(),
  hasJobDescription: z.boolean(),
  location: z.string().optional(),
  status: z.string(),
  tailoredResume: z
    .object({
      id: z.string(),
      title: z.string(),
      updatedAt: z.iso.datetime(),
    })
    .nullable(),
});

export const jobApplicationResumeResponseSchema =
  generatedResumeResultSchema.extend({
    application: z.object({
      id: z.string(),
      company: z.string(),
      position: z.string(),
    }),
  });

export const saveTailoredResumeRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z
    .string()
    .min(1, "Content is required")
    .refine((value) => {
      try {
        const raw: unknown = JSON.parse(value);
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
        return (
          !("schemaVersion" in raw) ||
          savedGeneratedResumeSchema.safeParse(raw).success
        );
      } catch {
        return false;
      }
    }, "Resume content must be a valid saved document."),
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

export type ApplicationResumeInfoResponse = z.infer<
  typeof applicationResumeInfoResponseSchema
>;
export type JobApplicationResumeResponse = z.infer<
  typeof jobApplicationResumeResponseSchema
>;
export type SaveTailoredResumeRequest = z.infer<
  typeof saveTailoredResumeRequestSchema
>;
export type SaveTailoredResumeResponse = z.infer<
  typeof saveTailoredResumeResponseSchema
>;
