import { z } from "zod";
import {
  generateResumeSchema,
  jobApplicationResumeRequestSchema,
} from "../../profile/validators";
import { generatedResumeResultSchema } from "@/lib/resume-document";

export const jobIntentSchema = z.enum([
  "preview",
  "download",
  "save-and-download",
]);
export const generationJobPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("profile"),
    intent: z.enum(["preview", "download"]).default("preview"),
    request: generateResumeSchema,
  }),
  z.object({
    kind: z.literal("application"),
    intent: jobIntentSchema.default("preview"),
    request: jobApplicationResumeRequestSchema,
  }),
]);
export const generationJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);
export const acceptedGenerationJobSchema = z.object({
  jobId: z.uuid(),
  status: generationJobStatusSchema,
});
export const generationJobResponseSchema = z.object({
  id: z.uuid(),
  status: generationJobStatusSchema,
  payload: generationJobPayloadSchema,
  result: generatedResumeResultSchema.nullable(),
  error: z.string().nullable(),
  savedResumeId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const latestGenerationJobSchema = generationJobResponseSchema.nullable();
export type GenerationJobPayload = z.infer<typeof generationJobPayloadSchema>;
export type GenerationJobResponse = z.infer<typeof generationJobResponseSchema>;
