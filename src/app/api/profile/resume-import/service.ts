import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { Mistral } from "@mistralai/mistralai";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type { CreateUserProfileRequest } from "@/app/api/profile/validators";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import { env } from "@/lib/env";
import { resumeImportResponseSchema, type ResumeImportResponse } from "./validators";

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
});

const aiProfileSchema = aiProfileGenerationSchema.extend({
  warnings: z.array(z.string()).optional(),
});

export class ResumeImportService {
  async importProfileFromResume(params: ImportParams): Promise<ResumeImportResponse> {
    const markdown = await this.extractMarkdown(params);
    const { profile, warnings } = await this.extractProfile(markdown);

    return resumeImportResponseSchema.parse({
      profile,
      markdown,
      warnings,
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
  ): Promise<{ profile: CreateUserProfileRequest; warnings: string[]; }> {
    if (!markdown || markdown.trim().length === 0) {
      const profile = createUserProfileSchema.parse(this.emptyProfile());
      return {
        profile,
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
        fallback.warnings.push(
          "AI parsing failed. Populating fields using basic text extraction—please review and edit.",
        );
        return fallback;
      }
    }

    const fallback = this.fallbackExtractProfile(markdown);
    fallback.warnings.push(
      "Structured AI parsing is not configured. Imported values use basic text extraction—please review.",
    );
    return fallback;
  }

  private async aiExtractProfile(
    markdown: string,
  ): Promise<{ profile: CreateUserProfileRequest; warnings: string[]; }> {
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
      maxOutputTokens: 2000,
    });

    const { warnings: modelWarningsRaw, ...rawProfile } = result.object;
    const normalized = this.normalizeProfile(rawProfile as Record<string, unknown>);
    const profile = createUserProfileSchema.parse(normalized);

    const modelWarnings =
      Array.isArray(modelWarningsRaw)
        ? modelWarningsRaw.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
        : [];

    const warnings = this.collectWarnings(profile, modelWarnings);

    return { profile, warnings };
  }

  private fallbackExtractProfile(
    markdown: string,
  ): { profile: CreateUserProfileRequest; warnings: string[]; } {
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
      warnings: this.collectWarnings(profile, warnings),
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

  private normalizeProfile(data: Record<string, unknown>): CreateUserProfileRequest {
    let firstName =
      this.stringOrNull(
        data.firstName ??
        data.first_name ??
        data.givenName ??
        data.given_name ??
        data.name_first,
      ) ?? null;
    let lastName =
      this.stringOrNull(
        data.lastName ??
        data.last_name ??
        data.familyName ??
        data.family_name ??
        data.surname,
      ) ?? null;

    if (!firstName && !lastName) {
      const fullName = this.stringOrNull(data.fullName ?? data.full_name ?? data.name);
      if (fullName) {
        const parts = fullName.split(/\s+/).filter((part) => part.length > 0);
        if (parts.length === 1) {
          firstName = parts[0];
        } else if (parts.length >= 2) {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }
      }
    }

    return {
      firstName,
      lastName,
      email: this.stringOrNull(data.email),
      phone: this.sanitizePhone(this.stringOrNull(data.phone ?? data.phoneNumber)),
      address: this.stringOrNull(data.address),
      city: this.stringOrNull(data.city),
      state: this.stringOrNull(data.state ?? data.region),
      zipCode: this.stringOrNull(data.zipCode ?? data.postalCode ?? data.zip),
      country: this.stringOrNull(data.country),
      linkedinUrl: this.stringOrNull(data.linkedinUrl ?? data.linkedin),
      githubUrl: this.stringOrNull(data.githubUrl ?? data.github),
      portfolioUrl: this.stringOrNull(
        data.portfolioUrl ?? data.website ?? data.site ?? data.personalSite,
      ),
      professionalSummary: this.truncateSummary(
        this.stringOrNull(
          data.professionalSummary ?? data.summary ?? data.profile ?? data.objective,
        ),
      ),
    };
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
