import { z } from "zod";
import { shortText } from "@/lib/validators/fields";
import { generatedResumeResultSchema } from "@/lib/resume-document";

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

// A save names the generation job it keeps. The server then takes the document
// and its PDF from that job, so the two cannot disagree and the PDF does not
// have to travel back through the browser.
export const saveTailoredResumeRequestSchema = z.object({
  title: shortText.min(1, "Title is required"),
  jobId: z.uuid(),
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
