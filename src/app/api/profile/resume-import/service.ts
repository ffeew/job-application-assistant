import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { Mistral } from "@mistralai/mistralai";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type { CreateUserProfileRequest } from "@/app/api/profile/validators";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import { env } from "@/lib/env";
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

type ImportParams = {
  arrayBuffer: ArrayBuffer;
  mimeType: string;
};

export class ResumeImportError extends Error {
  status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message);
    this.name = "ResumeImportError";
    this.status = status;
    if (cause) {
      this.cause = cause;
    }
  }
}

const mistralClient = new Mistral({
  apiKey: env.MISTRAL_API_KEY,
});


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
  workExperiences: z
    .array(
      z.object({
        jobTitle: z.string().nullable(),
        company: z.string().nullable(),
        location: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        isCurrent: z.boolean().nullable(),
        description: z.string().nullable(),
        technologies: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string().nullable(),
        fieldOfStudy: z.string().nullable(),
        institution: z.string().nullable(),
        location: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        gpa: z.string().nullable(),
        honors: z.string().nullable(),
        relevantCoursework: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        name: z.string().nullable(),
        category: z.string().nullable(),
        proficiencyLevel: z.string().nullable(),
        yearsOfExperience: z.number().nullable(),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        technologies: z.array(z.string()).optional(),
        projectUrl: z.string().nullable(),
        githubUrl: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        isOngoing: z.boolean().nullable(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().nullable(),
        issuingOrganization: z.string().nullable(),
        issueDate: z.string().nullable(),
        expirationDate: z.string().nullable(),
        credentialId: z.string().nullable(),
        credentialUrl: z.string().nullable(),
      }),
    )
    .default([]),
  achievements: z
    .array(
      z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        organization: z.string().nullable(),
        date: z.string().nullable(),
        url: z.string().nullable(),
      }),
    )
    .default([]),
  references: z
    .array(
      z.object({
        name: z.string().nullable(),
        title: z.string().nullable(),
        company: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        relationship: z.string().nullable(),
      }),
    )
    .default([]),
});

const aiProfileSchema = aiProfileGenerationSchema.extend({
  warnings: z.array(z.string()).optional(),
});

const SKILL_CATEGORIES = new Set(["technical", "soft", "language", "tool", "framework", "other"]);
const SKILL_PROFICIENCY_LEVELS = new Set(["beginner", "intermediate", "advanced", "expert"]);
const REFERENCE_RELATIONSHIPS = new Set(["manager", "colleague", "client", "professor", "mentor", "other"]);

type AiProfile = z.infer<typeof aiProfileSchema>;

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
    const markdown = await this.extractMarkdown(params);
    const extraction = await this.extractProfile(markdown);

    return resumeImportResponseSchema.parse({
      ...extraction,
      markdown,
    });
  }

  private async extractMarkdown({ arrayBuffer, mimeType }: ImportParams): Promise<string> {
    const normalizedMimeType = mimeType || "application/octet-stream";
    const fileBuffer = Buffer.from(arrayBuffer);

    if (normalizedMimeType === "text/plain") {
      const plainText = fileBuffer.toString("utf8");
      if (plainText.trim().length === 0) {
        throw new ResumeImportError("Uploaded text file did not contain readable content.", 400);
      }
      return plainText;
    }

    try {
      const response = await this.runMistralOcr({
        fileBuffer,
        mimeType: normalizedMimeType,
      });

      const markdown = this.extractMarkdownFromOcrResponse(response);

      if (!markdown) {
        throw new ResumeImportError("Mistral OCR response did not include markdown content.", 502);
      }

      return markdown;
    } catch (error) {
      if (error instanceof ResumeImportError) {
        throw error;
      }

      console.error("Mistral SDK OCR error:", error);
      throw new ResumeImportError(
        "Unable to process the resume with Mistral OCR. Please try again.",
        502,
        error,
      );
    }
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
The resume content has already been converted to GitHub-Flavored Markdown via OCR.

Populate the provided schema using only facts that appear in the resume. Use null for fields that are missing, keep URLs complete, and limit the professional summary to 600 characters or fewer. Do not invent information.`;

    const result = await generateObject({
      model: groq(env.GROQ_MODEL),
      schema: aiProfileSchema,
      prompt: `${prompt}\n\nResume Markdown:\n"""\n${markdown}\n"""`,
      temperature: 0.2,
      maxOutputTokens: 20000,
    });

    const aiData = aiProfileSchema.parse(result.object);

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
        firstName = parts[0];
      } else if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
    }

    const email = this.stringOrNull(this.matchPattern(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i));
    const phone = this.stringOrNull(
      this.matchPattern(
        text,
        /(\+?\d[\d\s().-]{7,}\d)/,
      ),
    );
    const linkedinUrl = this.stringOrNull(
      this.matchPattern(
        text,
        /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i,
      ),
    );
    const githubUrl = this.stringOrNull(
      this.matchPattern(
        text,
        /https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i,
      ),
    );
    const websiteUrl = this.stringOrNull(
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
    const firstName = this.stringOrNull(data.firstName);
    const lastName = this.stringOrNull(data.lastName);

    return {
      firstName,
      lastName,
      email: this.stringOrNull(data.email),
      phone: this.sanitizePhone(this.stringOrNull(data.phone)),
      address: this.stringOrNull(data.address),
      city: this.stringOrNull(data.city),
      state: this.stringOrNull(data.state),
      zipCode: this.stringOrNull(data.zipCode),
      country: this.stringOrNull(data.country),
      linkedinUrl: this.stringOrNull(data.linkedinUrl),
      githubUrl: this.stringOrNull(data.githubUrl),
      portfolioUrl: this.stringOrNull(
        data.portfolioUrl,
      ),
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

    data?.forEach((experience, index) => {
      if (!experience) {
        return;
      }

      const jobTitle = this.stringOrNull(experience.jobTitle);
      const company = this.stringOrNull(experience.company);
      const location = this.stringOrNull(experience.location);
      const description = this.stringOrNull(experience.description);
      const startDate = this.normalizeResumeDate(this.stringOrNull(experience.startDate));
      let endDate = this.normalizeResumeDate(this.stringOrNull(experience.endDate));
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

    data?.forEach((education, index) => {
      if (!education) {
        return;
      }

      const degree = this.stringOrNull(education.degree);
      const institution = this.stringOrNull(education.institution);
      const fieldOfStudy = this.stringOrNull(education.fieldOfStudy);
      const location = this.stringOrNull(education.location);
      const gpa = this.stringOrNull(education.gpa);
      const honors = this.stringOrNull(education.honors);
      const startDate = this.normalizeResumeDate(this.stringOrNull(education.startDate));
      const endDate = this.normalizeResumeDate(this.stringOrNull(education.endDate));
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

    data?.forEach((skill, index) => {
      if (!skill) {
        return;
      }

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

    data?.forEach((project, index) => {
      if (!project) {
        return;
      }

      const title = this.stringOrNull(project.title);
      if (!title) {
        warnings.push(`Skipped a project entry at position ${index + 1} due to missing title.`);
        return;
      }

      const startDate = this.normalizeResumeDate(this.stringOrNull(project.startDate));
      const endDateRaw = this.stringOrNull(project.endDate);
      const endDate = this.normalizeResumeDate(endDateRaw);
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

    data?.forEach((certification, index) => {
      if (!certification) {
        return;
      }

      const name = this.stringOrNull(certification.name);
      const issuingOrganization = this.stringOrNull(certification.issuingOrganization);
      if (!name || !issuingOrganization) {
        warnings.push(`Skipped a certification entry at position ${index + 1} due to missing name or issuing organization.`);
        return;
      }

      items.push({
        name,
        issuingOrganization,
        issueDate: this.normalizeResumeDate(this.stringOrNull(certification.issueDate)),
        expirationDate: this.normalizeResumeDate(this.stringOrNull(certification.expirationDate)),
        credentialId: this.stringOrNull(certification.credentialId),
        credentialUrl: this.normalizeUrl(certification.credentialUrl),
      });
    });

    return { items, warnings };
  }

  private normalizeAchievements(data: AiProfile["achievements"]): SectionNormalizationResult<ResumeImportAchievement> {
    const warnings: string[] = [];
    const items: ResumeImportAchievement[] = [];

    data?.forEach((achievement, index) => {
      if (!achievement) {
        return;
      }

      const title = this.stringOrNull(achievement.title);
      if (!title) {
        warnings.push(`Skipped an achievement entry at position ${index + 1} due to missing title.`);
        return;
      }

      items.push({
        title,
        description: this.stringOrNull(achievement.description),
        organization: this.stringOrNull(achievement.organization),
        date: this.normalizeResumeDate(this.stringOrNull(achievement.date)),
        url: this.normalizeUrl(achievement.url),
      });
    });

    return { items, warnings };
  }

  private normalizeReferences(data: AiProfile["references"]): SectionNormalizationResult<ResumeImportReference> {
    const warnings: string[] = [];
    const items: ResumeImportReference[] = [];

    data?.forEach((reference, index) => {
      if (!reference) {
        return;
      }

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

  private normalizeResumeDate(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
      return trimmed;
    }

    if (/^\d{4}$/.test(trimmed)) {
      return `${trimmed}-01`;
    }

    if (/present|current/i.test(trimmed)) {
      return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getUTCFullYear();
    const month = (parsed.getUTCMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  }

  private normalizeUrl(value: string | null): string | null {
    const urlString = this.stringOrNull(value);
    if (!urlString) {
      return null;
    }

    const prefixed = /^[a-zA-Z]+:\/\//.test(urlString) ? urlString : `https://${urlString}`;
    try {
      const url = new URL(prefixed);
      return url.toString();
    } catch {
      return null;
    }
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

  private extractMarkdownFromOcrResponse(response: unknown): string | null {
    if (!response || typeof response !== "object") {
      return null;
    }

    const pages = Array.isArray((response as { pages?: unknown; }).pages)
      ? ((response as { pages: unknown[]; }).pages as Array<{ markdown?: unknown; text?: unknown; }>)
      : [];

    const sections = pages
      .map((page) => {
        if (page && typeof page === "object") {
          if (typeof page.markdown === "string" && page.markdown.trim().length > 0) {
            return page.markdown.trim();
          }
          if (typeof page.text === "string" && page.text.trim().length > 0) {
            return page.text.trim();
          }
        }
        return null;
      })
      .filter((section): section is string => Boolean(section && section.length > 0));

    if (sections.length > 0) {
      return sections.join("\n\n");
    }

    if (
      "documentAnnotation" in (response as { documentAnnotation?: unknown; }) &&
      typeof (response as { documentAnnotation?: unknown; }).documentAnnotation === "string"
    ) {
      return (response as { documentAnnotation: string; }).documentAnnotation;
    }

    return null;
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

  private async runMistralOcr({
    fileBuffer,
    mimeType,
  }: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<unknown> {
    const normalizedMime = mimeType.toLowerCase();

    if (normalizedMime === "application/pdf") {
      return this.processPdfWithMistral(mistralClient, fileBuffer);
    }

    if (
      normalizedMime === "application/msword" ||
      normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return this.processDocWithMistral(mistralClient, fileBuffer, normalizedMime);
    }

    if (normalizedMime === "application/octet-stream") {
      // Best effort: assume PDF
      return this.processPdfWithMistral(mistralClient, fileBuffer);
    }

    throw new ResumeImportError("Unsupported resume file type for OCR.", 415);
  }

  private async processPdfWithMistral(
    client: Mistral,
    fileBuffer: Buffer,
  ): Promise<unknown> {
    const base64File = fileBuffer.toString("base64");
    return client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${base64File}`,
      },
    });
  }

  private async processDocWithMistral(
    client: Mistral,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<unknown> {
    const extension = mimeType === "application/msword" ? "doc" : "docx";
    const uploaded = await client.files.upload({
      file: {
        fileName: `${randomUUID()}.${extension}`,
        content: fileBuffer,
      },
      purpose: "ocr",
    });

    try {
      const signedUrl = await client.files.getSignedUrl({
        fileId: uploaded.id,
      });

      return await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl: signedUrl.url,
        },
      });
    } finally {
      try {
        await client.files.delete({
          fileId: uploaded.id,
        });
      } catch (cleanupError) {
        console.warn("Failed to delete temporary document from Mistral:", cleanupError);
      }
    }
  }
}
