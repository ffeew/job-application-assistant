import { z } from "zod";

// Defaults keep legacy resumes readable when stored content omits sections.
export const resumeContentSchema = z.object({
  personalInfo: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    address: z.string().default(""),
  }).prefault({}),
  summary: z.string().default(""),
  experience: z.string().default(""),
  education: z.string().default(""),
  skills: z.string().default(""),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
