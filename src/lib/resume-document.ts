import { z } from "zod";
import { intelligentContentSelectionSchema } from "@/app/api/profile/validators";

const text = z.string().max(20000);
const linkSchema = z.object({
  label: text,
  text,
  url: z.string().max(2000).optional(),
});
export const resumeBulletSchema = z.object({
  sourceId: z.string(),
  text: text.min(1),
});
export const resumeEntrySchema = z.object({
  sourceId: z.string(),
  heading: text,
  subheading: text,
  dates: text,
  details: z.array(text),
  links: z.array(linkSchema),
  bullets: z.array(resumeBulletSchema),
});
export const resumeDocumentSchema = z.object({
  title: text.min(1),
  name: text,
  contacts: z.array(linkSchema),
  summary: text.nullable(),
  sections: z.array(
    z.object({
      kind: z.enum([
        "work",
        "education",
        "skills",
        "projects",
        "certifications",
        "achievements",
        "references",
      ]),
      title: text,
      entries: z.array(resumeEntrySchema),
    }),
  ),
});
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeEntry = z.infer<typeof resumeEntrySchema>;

export const compilationResultSchema = z.object({
  pdfBase64: z.string().min(1).max(2800000),
  pageCount: z.number().int().positive(),
  overflowPt: z.number().nonnegative(),
  warnings: z.array(z.string()),
});
export type CompilationResult = z.infer<typeof compilationResultSchema>;
export const fitSchema = z.object({
  targetPages: z.union([z.literal(1), z.literal(2)]),
  pageCount: z.number().int().positive(),
  revisions: z.number().int().min(0).max(3),
  fitsTarget: z.boolean(),
  changes: z.array(z.string()),
  warnings: z.array(z.string()),
});
export const savedGeneratedResumeSchema = z.object({
  schemaVersion: z.literal(2),
  renderer: z.literal("latex"),
  templateVersion: z.literal(1),
  document: resumeDocumentSchema,
  aiSelection: intelligentContentSelectionSchema.nullable(),
  config: z.record(z.string(), z.unknown()),
  generatedAt: z.iso.datetime(),
  fit: fitSchema,
});
export const generatedResumeResultSchema = savedGeneratedResumeSchema.extend({
  pdfBase64: compilationResultSchema.shape.pdfBase64,
});
export type GeneratedResumeResult = z.infer<typeof generatedResumeResultSchema>;
export type SavedGeneratedResume = z.infer<typeof savedGeneratedResumeSchema>;

export function parseGeneratedResume(
  content: string,
): SavedGeneratedResume | null {
  try {
    const raw: unknown = JSON.parse(content);
    const parsed = savedGeneratedResumeSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function serializeGeneratedResume(
  result: GeneratedResumeResult,
): string {
  // Persist content snapshots so saved resumes can be recompiled without storing PDFs.
  return JSON.stringify(savedGeneratedResumeSchema.parse(result));
}

/** Legacy consumers need plain sections rather than the generated document shape. */
export function documentToResumeContent(document: ResumeDocument) {
  const sectionText = (kind: ResumeDocument["sections"][number]["kind"]) =>
    document.sections
      .filter((section) => section.kind === kind)
      .flatMap((section) =>
        section.entries.map((entry) =>
          [
            entry.heading,
            entry.subheading,
            entry.dates,
            ...entry.details,
            ...entry.bullets.map((bullet) => bullet.text),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      )
      .join("\n\n");
  const contact = (label: string) =>
    document.contacts.find((item) => item.label === label)?.text ?? "";
  return {
    personalInfo: {
      name: document.name,
      email: contact("Email"),
      phone: contact("Mobile"),
      address: contact("Location"),
    },
    summary: document.summary ?? "",
    experience: sectionText("work"),
    education: sectionText("education"),
    skills: sectionText("skills"),
    projects: sectionText("projects"),
    certifications: sectionText("certifications"),
    achievements: sectionText("achievements"),
  };
}
