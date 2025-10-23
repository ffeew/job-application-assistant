import { z } from "zod";

import { createUserProfileSchema } from "@/app/api/profile/validators";

export const resumeImportResponseSchema = z.object({
  profile: createUserProfileSchema,
  markdown: z.string().nullable(),
  warnings: z.array(z.string()).default([]),
});

export type ResumeImportResponse = z.infer<typeof resumeImportResponseSchema>;
