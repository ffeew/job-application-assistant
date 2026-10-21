import { z } from "zod";

// Defaults keep legacy resumes readable when stored content omits sections.
export const resumeContentSchema = z.object({
  personalInfo: z
    .object({
      name: z.string().default(""),
      email: z.string().default(""),
      phone: z.string().default(""),
      address: z.string().default(""),
    })
    .prefault({}),
  summary: z.string().default(""),
  experience: z.string().default(""),
  education: z.string().default(""),
  skills: z.string().default(""),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

// Generated snapshots and legacy HTML resumes carry these keys; the manual
// schema would accept them as an empty resume.
const otherFormatKeys = ["schemaVersion", "renderer", "document", "html"];

/**
 * Reads stored content as a manual resume, or returns null for anything else,
 * so the editor never opens other content as a blank form and saves over it.
 */
export function parseManualResumeContent(
  content: string,
): ResumeContent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return null;
  if (otherFormatKeys.some((key) => key in raw)) return null;
  const parsed = resumeContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
