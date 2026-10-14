import { z } from "zod";

export const resumeUploadJsonSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const resumeUploadsResponseSchema = z.object({
  // False on a server without file storage, where imports keep no original.
  available: z.boolean(),
  files: z.array(resumeUploadJsonSchema),
});

export type ResumeUploadJson = z.infer<typeof resumeUploadJsonSchema>;
export type ResumeUploadsResponse = z.infer<typeof resumeUploadsResponseSchema>;
