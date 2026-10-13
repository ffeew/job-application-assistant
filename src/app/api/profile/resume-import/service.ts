import { createGroq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type { CreateUserProfileRequest } from "@/app/api/profile/validators";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import { env } from "@/lib/env";
import { getGroqGenerationOptions } from "@/lib/groq-model";
import { normalizeMonth } from "@/lib/month";
import { normalizeHttpUrl, SHORT_TEXT_MAX } from "@/lib/validators/fields";
import { recognizeScannedPdf } from "@/lib/ocr-service";
import { extractResumeText, type ScannedPdfReader } from "./document-text";
import {
  resumeImportResponseSchema,
  type ResumeImportAchievement,
  type ResumeImportCertification,
  type ResumeImportEducation,
  type ResumeImportProject,
  type ResumeImportReference,
  type ResumeImportResponse,
  type ResumeImportSkill,
  type ResumeImportWorkExperience,
} from "./validators";

const SUMMARY_SECTION_PATTERNS = [
  /^summary$/i,
  /^professional summary$/i,
  /^profile$/i,
  /^about me$/i,
  /^objective$/i,
];

const MAX_RESUME_TEXT_CHARS = 60_000;
// Structured extraction of a full resume takes far longer than a short reply.
const EXTRACTION_TIMEOUT_MS = 90_000;

type ImportParams = {
  arrayBuffer: ArrayBuffer;
  mimeType: string;
};

const ocrService =
  env.OCR_SERVICE_URL && env.OCR_SERVICE_TOKEN
    ? { url: env.OCR_SERVICE_URL, token: env.OCR_SERVICE_TOKEN }
    : null;
// Scanned PDFs need the OCR service; every other import works without it.
const readScannedPdf: ScannedPdfReader | null = ocrService
  ? (pdf) => recognizeScannedPdf(ocrService, new Uint8Array(pdf))
  : null;

// Groq's strict structured output requires every property; nullable fields allow
// missing source values without optional JSON Schema properties.
const aiProfileGenerationSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  professionalSummary: z.string().nullable(),
  workExperiences: z.array(
    z.object({
      jobTitle: z.string().nullable(),
      company: z.string().nullable(),
      location: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      isCurrent: z.boolean().nullable(),
      description: z.string().nullable(),
      technologies: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string().nullable(),
      fieldOfStudy: z.string().nullable(),
      institution: z.string().nullable(),
      location: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      gpa: z.string().nullable(),
      honors: z.string().nullable(),
      relevantCoursework: z.array(z.string()),
    }),
  ),
  skills: z.array(
    z.object({
      name: z.string().nullable(),
      category: z.string().nullable(),
      proficiencyLevel: z.string().nullable(),
      yearsOfExperience: z.number().nullable(),
    }),
  ),
  projects: z.array(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      technologies: z.array(z.string()),
      projectUrl: z.string().nullable(),
      githubUrl: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      isOngoing: z.boolean().nullable(),
    }),
  ),
  certifications: z.array(
    z.object({
      name: z.string().nullable(),
      issuingOrganization: z.string().nullable(),
      issueDate: z.string().nullable(),
      expirationDate: z.string().nullable(),
      credentialId: z.string().nullable(),
      credentialUrl: z.string().nullable(),
    }),
  ),
  achievements: z.array(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      organization: z.string().nullable(),
      date: z.string().nullable(),
      url: z.string().nullable(),
    }),
  ),
  references: z.array(
    z.object({
      name: z.string().nullable(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      relationship: z.string().nullable(),
    }),
  ),
  warnings: z.array(z.string()),
});

const SKILL_CATEGORIES = new Set(["technical", "soft", "language", "tool", "framework", "other"]);
const SKILL_PROFICIENCY_LEVELS = new Set(["beginner", "intermediate", "advanced", "expert"]);
const REFERENCE_RELATIONSHIPS = new Set(["manager", "colleague", "client", "professor", "mentor", "other"]);

type AiProfile = z.infer<typeof aiProfileGenerationSchema>;

type SectionNormalizationResult<T> = {
  items: T[];
  warnings: string[];
};

type NormalizedResumeData = {
  profile: CreateUserProfileRequest;
  workExperiences: ResumeImportWorkExperience[];
  education: ResumeImportEducation[];
  skills: ResumeImportSkill[];
  projects: ResumeImportProject[];
  certifications: ResumeImportCertification[];
  achievements: ResumeImportAchievement[];
  references: ResumeImportReference[];
  warnings: string[];
};

export class ResumeImportService {
  async importProfileFromResume(params: ImportParams): Promise<ResumeImportResponse> {
    const extracted = await extractResumeText({
      fileBuffer: Buffer.from(params.arrayBuffer),
      mimeType: params.mimeType,
      readScannedPdf,
    });
    const warnings = [...extracted.warnings];
    // A resume is a few thousand characters. Anything far beyond that is some
    // other document, and the whole of it would be billed as model input.
    let markdown = extracted.markdown;
    if (markdown.length > MAX_RESUME_TEXT_CHARS) {
      markdown = markdown.slice(0, MAX_RESUME_TEXT_CHARS);
      warnings.push(
        "This document is longer than a resume, so only its first part was read.",
      );
    }
    const extraction = await this.extractProfile(markdown);

    return resumeImportResponseSchema.parse({
      ...extraction,
      warnings: [...warnings, ...extraction.warnings],
      markdown,
    });
  }

  private async extractProfile(
    markdown: string,
  ): Promise<NormalizedResumeData> {
    if (!markdown || markdown.trim().length === 0) {
      const profile = createUserProfileSchema.parse(this.emptyProfile());
      return {
        profile,
        workExperiences: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        achievements: [],
        references: [],
        warnings: ["The uploaded resume did not contain readable text."],
      };
    }

    if (env.GROQ_API_KEY) {
      try {
        const aiResult = await this.aiExtractProfile(markdown);
        return aiResult;
      } catch (error) {
        console.error("AI-based resume parsing failed. Falling back to heuristics.", error);
        const fallback = this.fallbackExtractProfile(markdown);
        return {
          ...fallback,
          warnings: [
            ...fallback.warnings,
            "AI parsing failed. Populating fields using basic text extraction—please review and edit.",
          ],
        };
      }
    }

    const fallback = this.fallbackExtractProfile(markdown);
    return {
      ...fallback,
      warnings: [
        ...fallback.warnings,
        "Structured AI parsing is not configured. Imported values use basic text extraction—please review.",
      ],
    };
  }

  private async aiExtractProfile(
    markdown: string,
  ): Promise<NormalizedResumeData> {
    const groq = createGroq({
      apiKey: env.GROQ_API_KEY,
    });

    const prompt = `You are assisting with resume onboarding for a job-application tool.
The resume content was extracted as plain text, so the layout may be imperfect. A trailing "Links:" list holds link targets that were not visible in the text.

Populate the provided schema using only facts that appear in the resume. Use null for fields that are missing, keep URLs complete with their https:// scheme, and limit the professional summary to 600 characters or fewer. Write every date as YYYY-MM, using 01 for the month when only the year is given, and use null with isCurrent or isOngoing set to true for a role or project that has not ended. Do not invent information.`;

    const result = await generateText({
      model: groq(env.GROQ_MODEL),
      ...getGroqGenerationOptions(env.GROQ_MODEL, 20000),
      output: Output.object({ schema: aiProfileGenerationSchema }),
      prompt: `${prompt}\n\nResume Markdown:\n"""\n${markdown}\n"""`,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
    });

    const aiData = aiProfileGenerationSchema.parse(result.output);

    const profile = this.normalizeProfile(aiData);
    const workExperiences = this.normalizeWorkExperiences(aiData.workExperiences);
    const education = this.normalizeEducation(aiData.education);
    const skills = this.normalizeSkills(aiData.skills);
    const projects = this.normalizeProjects(aiData.projects);
    const certifications = this.normalizeCertifications(aiData.certifications);
    const achievements = this.normalizeAchievements(aiData.achievements);
    const references = this.normalizeReferences(aiData.references);

    const modelWarnings =
      Array.isArray(aiData.warnings)
        ? aiData.warnings.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
        : [];

    const warnings = this.collectWarnings(profile, [
      ...modelWarnings,
      ...workExperiences.warnings,
      ...education.warnings,
      ...skills.warnings,
      ...projects.warnings,
      ...certifications.warnings,
      ...achievements.warnings,
      ...references.warnings,
    ]);

    return {
      profile,
      workExperiences: workExperiences.items,
      education: education.items,
      skills: skills.items,
      projects: projects.items,
      certifications: certifications.items,
      achievements: achievements.items,
      references: references.items,
      warnings,
    };
  }

  private fallbackExtractProfile(
    markdown: string,
  ): NormalizedResumeData {
    const text = markdown.replace(/\r/g, "\n");
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let firstName: string | null = null;
    let lastName: string | null = null;
    const nameCandidate = this.findLikelyName(lines);

    if (nameCandidate) {
      const parts = nameCandidate.split(/\s+/).filter((part) => part.length > 0);
      if (parts.length === 1) {
        firstName = parts[0] ?? null;
      } else if (parts.length >= 2) {
        firstName = parts[0] ?? null;
        lastName = parts.slice(1).join(" ");
      }
    }

    const email = this.normalizeEmail(this.matchPattern(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i));
    const phone = this.stringOrNull(
      this.matchPattern(
        text,
        /(\+?\d[\d\s().-]{7,}\d)/,
      ),
    );
    const linkedinUrl = this.normalizeUrl(
      this.matchPattern(
        text,
        /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i,
      ),
    );
    const githubUrl = this.normalizeUrl(
      this.matchPattern(
        text,
        /https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i,
      ),
    );
    const websiteUrl = this.normalizeUrl(
      this.matchPattern(
        text,
        /https?:\/\/(?!.*(?:linkedin|github)\.com)[^\s)]+/i,
      ),
    );

    const professionalSummary = this.extractSummary(lines);

    const profile = createUserProfileSchema.parse({
      ...this.emptyProfile(),
      firstName,
      lastName,
      email,
      phone,
      linkedinUrl,
      githubUrl,
      portfolioUrl: websiteUrl,
      professionalSummary,
    });

    const warnings: string[] = [
      "Resume import used heuristic extraction. Double-check the populated fields before saving.",
    ];

    return {
      profile,
      workExperiences: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      achievements: [],
      references: [],
      warnings: this.collectWarnings(profile, [
        ...warnings,
        "Structured sections could not be inferred automatically.",
      ]),
    };
  }

  private emptyProfile(): CreateUserProfileRequest {
    return {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      country: null,
      linkedinUrl: null,
      githubUrl: null,
      portfolioUrl: null,
      professionalSummary: null,
    };
  }

  private normalizeProfile(data: AiProfile): CreateUserProfileRequest {
    // The profile schema limits each field. A value the model returned too long
    // is cut to fit, because failing validation would lose the whole import.
    const short = (value: string | null) =>
      this.stringOrNull(value)?.slice(0, SHORT_TEXT_MAX) ?? null;

    return {
      firstName: short(data.firstName),
      lastName: short(data.lastName),
      email: this.normalizeEmail(data.email),
      phone: this.sanitizePhone(short(data.phone)),
      address: short(data.address),
      city: short(data.city),
      state: short(data.state),
      zipCode: short(data.zipCode),
      country: short(data.country),
      linkedinUrl: this.normalizeUrl(data.linkedinUrl),
      githubUrl: this.normalizeUrl(data.githubUrl),
      portfolioUrl: this.normalizeUrl(data.portfolioUrl),
      professionalSummary: this.truncateSummary(
        this.stringOrNull(
          data.professionalSummary,
        ),
      ),
    };
  }

  private normalizeWorkExperiences(data: AiProfile["workExperiences"]): SectionNormalizationResult<ResumeImportWorkExperience> {
    const warnings: string[] = [];
    const items: ResumeImportWorkExperience[] = [];

    data.forEach((experience, index) => {
      const jobTitle = this.stringOrNull(experience.jobTitle);
      const company = this.stringOrNull(experience.company);
      const location = this.stringOrNull(experience.location);
      const description = this.stringOrNull(experience.description);
      const startDate = normalizeMonth(this.stringOrNull(experience.startDate));
      let endDate = normalizeMonth(this.stringOrNull(experience.endDate));
      let isCurrent: boolean | null =
        typeof experience.isCurrent === "boolean" ? experience.isCurrent : null;

      if (!isCurrent && typeof experience.endDate === "string" && /present|current/i.test(experience.endDate)) {
        isCurrent = true;
        endDate = null;
      }

      if (!jobTitle || !company) {
        warnings.push(`Skipped a work experience entry at position ${index + 1} due to missing job title or company.`);
        return;
      }

      if (!startDate) {
        warnings.push(`Work experience "${jobTitle} at ${company}" is missing a recognizable start date.`);
      }

      items.push({
        jobTitle,
        company,
        location,
        startDate,
        endDate,
        isCurrent,
        description,
        technologies: this.normalizeStringArray(experience.technologies),
      });
    });

    return { items, warnings };
  }

  private normalizeEducation(data: AiProfile["education"]): SectionNormalizationResult<ResumeImportEducation> {
    const warnings: string[] = [];
    const items: ResumeImportEducation[] = [];

    data.forEach((education, index) => {
      const degree = this.stringOrNull(education.degree);
      const institution = this.stringOrNull(education.institution);
      const fieldOfStudy = this.stringOrNull(education.fieldOfStudy);
      const location = this.stringOrNull(education.location);
      const gpa = this.stringOrNull(education.gpa);
      const honors = this.stringOrNull(education.honors);
      const startDate = normalizeMonth(this.stringOrNull(education.startDate));
      const endDate = normalizeMonth(this.stringOrNull(education.endDate));
      const relevantCoursework = this.normalizeStringArray(education.relevantCoursework);

      if (!degree || !institution) {
        warnings.push(`Skipped an education entry at position ${index + 1} due to missing degree or institution.`);
        return;
      }

      items.push({
        degree,
        institution,
        fieldOfStudy,
        location,
        startDate,
        endDate,
        gpa,
        honors,
        relevantCoursework,
      });
    });

    return { items, warnings };
  }

  private normalizeSkills(data: AiProfile["skills"]): SectionNormalizationResult<ResumeImportSkill> {
    const warnings: string[] = [];
    const items: ResumeImportSkill[] = [];
    const seen = new Set<string>();

    data.forEach((skill, index) => {
      const name = this.stringOrNull(skill.name);
      if (!name) {
        warnings.push(`Skipped a skill entry at position ${index + 1} due to missing name.`);
        return;
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const category = this.normalizeSkillCategory(this.stringOrNull(skill.category));
      const proficiencyLevel = this.normalizeSkillLevel(this.stringOrNull(skill.proficiencyLevel));
      const yearsOfExperience = this.normalizeYearsOfExperience(skill.yearsOfExperience);

      items.push({
        name,
        category,
        proficiencyLevel,
        yearsOfExperience,
      });
    });

    return { items, warnings };
  }

  private normalizeProjects(data: AiProfile["projects"]): SectionNormalizationResult<ResumeImportProject> {
    const warnings: string[] = [];
    const items: ResumeImportProject[] = [];

    data.forEach((project, index) => {
      const title = this.stringOrNull(project.title);
      if (!title) {
        warnings.push(`Skipped a project entry at position ${index + 1} due to missing title.`);
        return;
      }

      const startDate = normalizeMonth(this.stringOrNull(project.startDate));
      const endDateRaw = this.stringOrNull(project.endDate);
      const endDate = normalizeMonth(endDateRaw);
      const derivedOngoing =
        endDate === null && typeof endDateRaw === "string" && /present|current/i.test(endDateRaw)
          ? true
          : null;
      const isOngoing =
        typeof project.isOngoing === "boolean"
          ? project.isOngoing
          : derivedOngoing;

      items.push({
        title,
        description: this.stringOrNull(project.description),
        technologies: this.normalizeStringArray(project.technologies),
        projectUrl: this.normalizeUrl(project.projectUrl),
        githubUrl: this.normalizeUrl(project.githubUrl),
        startDate,
        endDate,
        isOngoing: isOngoing ?? null,
      });
    });

    return { items, warnings };
  }

  private normalizeCertifications(data: AiProfile["certifications"]): SectionNormalizationResult<ResumeImportCertification> {
    const warnings: string[] = [];
    const items: ResumeImportCertification[] = [];

    data.forEach((certification, index) => {
      const name = this.stringOrNull(certification.name);
      const issuingOrganization = this.stringOrNull(certification.issuingOrganization);
      if (!name || !issuingOrganization) {
        warnings.push(`Skipped a certification entry at position ${index + 1} due to missing name or issuing organization.`);
        return;
      }

      items.push({
        name,
        issuingOrganization,
        issueDate: normalizeMonth(this.stringOrNull(certification.issueDate)),
        expirationDate: normalizeMonth(this.stringOrNull(certification.expirationDate)),
        credentialId: this.stringOrNull(certification.credentialId),
        credentialUrl: this.normalizeUrl(certification.credentialUrl),
      });
    });

    return { items, warnings };
  }

  private normalizeAchievements(data: AiProfile["achievements"]): SectionNormalizationResult<ResumeImportAchievement> {
    const warnings: string[] = [];
    const items: ResumeImportAchievement[] = [];

    data.forEach((achievement, index) => {
      const title = this.stringOrNull(achievement.title);
      if (!title) {
        warnings.push(`Skipped an achievement entry at position ${index + 1} due to missing title.`);
        return;
      }

      items.push({
        title,
        description: this.stringOrNull(achievement.description),
        organization: this.stringOrNull(achievement.organization),
        date: normalizeMonth(this.stringOrNull(achievement.date)),
        url: this.normalizeUrl(achievement.url),
      });
    });

    return { items, warnings };
  }

  private normalizeReferences(data: AiProfile["references"]): SectionNormalizationResult<ResumeImportReference> {
    const warnings: string[] = [];
    const items: ResumeImportReference[] = [];

    data.forEach((reference, index) => {
      const name = this.stringOrNull(reference.name);
      if (!name) {
        warnings.push(`Skipped a reference entry at position ${index + 1} due to missing name.`);
        return;
      }

      items.push({
        name,
        title: this.stringOrNull(reference.title),
        company: this.stringOrNull(reference.company),
        email: this.stringOrNull(reference.email),
        phone: this.sanitizePhone(this.stringOrNull(reference.phone)),
        relationship: this.normalizeReferenceRelationship(this.stringOrNull(reference.relationship)),
      });
    });

    return { items, warnings };
  }

  private stringOrNull(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private sanitizePhone(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const cleaned = value.replace(/[^\d+()\s-]/g, "").trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private truncateSummary(value: string | null): string | null {
    if (!value) {
      return null;
    }

    return value.length > 600 ? `${value.slice(0, 597)}...` : value;
  }

  private normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.stringOrNull(item))
        .filter((item): item is string => Boolean(item));
    }

    if (typeof value === "string") {
      return value
        .split(/[\n,;•]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    }

    return [];
  }

  // The profile schema rejects a malformed address, which would fail the whole
  // import. An unreadable address is dropped and reported as not detected.
  private normalizeEmail(value: string | null): string | null {
    const email = this.stringOrNull(value)?.replace(/^mailto:/i, "") ?? null;
    return z.email().safeParse(email).success ? email : null;
  }

  private normalizeUrl(value: string | null): string | null {
    return normalizeHttpUrl(value);
  }

  private normalizeSkillCategory(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.toLowerCase();
    return SKILL_CATEGORIES.has(normalized) ? normalized : null;
  }

  private normalizeSkillLevel(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.toLowerCase();
    return SKILL_PROFICIENCY_LEVELS.has(normalized) ? normalized : null;
  }

  private normalizeYearsOfExperience(value: number | null): number | null {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }

    const rounded = Math.max(0, Math.round(value));
    return Number.isFinite(rounded) ? rounded : null;
  }

  private normalizeReferenceRelationship(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.toLowerCase();
    return REFERENCE_RELATIONSHIPS.has(normalized) ? normalized : null;
  }

  private collectWarnings(
    profile: CreateUserProfileRequest,
    extras: string[] = [],
  ): string[] {
    const warnings = new Set<string>();

    extras
      .map((warning) => warning.trim())
      .filter((warning) => warning.length > 0)
      .forEach((warning) => warnings.add(warning));

    if (!profile.firstName || !profile.lastName) {
      warnings.add("Name was not fully detected.");
    }

    if (!profile.email) {
      warnings.add("Email address was not detected.");
    }

    if (!profile.phone) {
      warnings.add("Phone number was not detected.");
    }

    return Array.from(warnings);
  }

  private matchPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[0] : null;
  }

  private findLikelyName(lines: string[]): string | null {
    const candidates = lines.slice(0, 6);
    for (const line of candidates) {
      if (line.length > 60) {
        continue;
      }

      if (/^[A-Za-z][A-Za-z\s.,'-]*$/.test(line) && line.split(/\s+/).length <= 6) {
        return line.replace(/\s{2,}/g, " ").trim();
      }
    }

    return null;
  }

  private extractSummary(lines: string[]): string | null {
    let summary = "";
    let isCollecting = false;

    for (const line of lines) {
      const normalized = line.replace(/[*_#>-]/g, "").trim();

      if (
        SUMMARY_SECTION_PATTERNS.some((pattern) => pattern.test(normalized)) &&
        !isCollecting
      ) {
        isCollecting = true;
        continue;
      }

      if (isCollecting) {
        if (/^#{1,6}\s/.test(line) || SUMMARY_SECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
          break;
        }

        if (line.length === 0) {
          if (summary.length > 0) break;
          continue;
        }

        summary = `${summary} ${line}`.trim();
        if (summary.length >= 600) {
          summary = `${summary.slice(0, 597)}...`;
          break;
        }
      }
    }

    return summary.length > 0 ? summary : null;
  }
}
