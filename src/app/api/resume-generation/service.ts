import { ProfileService } from "../profile/service";
import { AIContentSelectionService } from "./ai-content-selection.service";
import { reviseResumeWithAI } from "./ai-resume-fitting.service";
import { buildResumeDocument, type ResumeData } from "@/lib/resume-data";
import { fitResume } from "@/lib/resume-fitting";
import { compileResumeLatex } from "@/lib/latex-compiler";
import { generateProfessionalResumeLatex } from "@/lib/resume-templates/professional-latex";
import {
  resumeDocumentSchema,
  type GeneratedResumeResult,
} from "@/lib/resume-document";
import type {
  GenerateResumeRequest,
  IntelligentContentSelection,
  JobApplicationResumeRequest,
  ResumeContentSelection,
} from "../profile/validators";
import type { ApplicationResponse } from "../applications/validators";

export class ResumeGenerationService {
  private profileService = new ProfileService();
  private aiContentService = new AIContentSelectionService();

  async generateResumeData(userId: string): Promise<ResumeData> {
    const order = { orderBy: "displayOrder" as const, order: "asc" as const };
    const [
      profile,
      workExperiences,
      education,
      skills,
      projects,
      certifications,
      achievements,
      references,
    ] = await Promise.all([
      this.profileService.getUserProfile(userId),
      this.profileService.getWorkExperiences(userId, order),
      this.profileService.getEducation(userId, order),
      this.profileService.getSkills(userId, order),
      this.profileService.getProjects(userId, order),
      this.profileService.getCertifications(userId, order),
      this.profileService.getAchievements(userId, order),
      this.profileService.getReferences(userId, order),
    ]);
    return {
      profile,
      workExperiences,
      education,
      skills,
      projects,
      certifications,
      achievements,
      references,
    };
  }

  private async generate(
    data: ResumeData,
    selection: ResumeContentSelection,
    request: GenerateResumeRequest | JobApplicationResumeRequest,
    signal: AbortSignal,
    aiSelection: IntelligentContentSelection | null = null,
    jobDescription: string | null = null,
  ): Promise<GeneratedResumeResult> {
    const source = resumeDocumentSchema.parse(
      buildResumeDocument(data, selection, request.title),
    );
    const result = await fitResume(
      source,
      request.targetPages,
      {
        compile: (document, abortSignal) =>
          compileResumeLatex(
            generateProfessionalResumeLatex(document),
            abortSignal,
          ),
        revise: (original, current, feedback, abortSignal) =>
          reviseResumeWithAI(
            original,
            current,
            feedback,
            request.targetPages,
            jobDescription,
            abortSignal,
          ),
      },
      signal,
    );
    return {
      schemaVersion: 2,
      renderer: "latex",
      templateVersion: 1,
      document: result.document,
      pdfBase64: result.compilation.pdfBase64,
      aiSelection,
      config: { ...request, template: "professional" },
      generatedAt: new Date().toISOString(),
      fit: result.fit,
    };
  }

  async generateResume(
    userId: string,
    request: GenerateResumeRequest,
  ): Promise<GeneratedResumeResult> {
    const signal = AbortSignal.timeout(180000);
    return this.generate(
      await this.generateResumeData(userId),
      request.contentSelection,
      request,
      signal,
    );
  }

  async generateResumePDF(
    userId: string,
    request: GenerateResumeRequest,
  ): Promise<Buffer> {
    const result = await this.generateResume(userId, request);
    return Buffer.from(result.pdfBase64, "base64");
  }

  async generateJobApplicationResume(
    userId: string,
    application: ApplicationResponse,
    request: JobApplicationResumeRequest,
  ): Promise<GeneratedResumeResult> {
    const signal = AbortSignal.timeout(180000);
    const data = await this.generateResumeData(userId);
    let aiSelection: IntelligentContentSelection | null = null;
    if (request.useAISelection && application.jobDescription) {
      try {
        aiSelection = await this.aiContentService.selectOptimalContent(
          application.jobDescription,
          data,
          request.maxWorkExperiences,
          request.maxProjects,
          request.maxSkills,
          signal,
        );
      } catch {
        // Original profile content remains usable when selection fails.
      }
    }
    const manual = request.manualOverrides;
    const workIds =
      manual?.workExperienceIds ??
      aiSelection?.selectedWorkExperiences ??
      data.workExperiences
        .slice(0, request.maxWorkExperiences)
        .map((item) => item.id);
    const educationIds =
      manual?.educationIds ??
      aiSelection?.selectedEducation ??
      data.education.map((item) => item.id);
    const skillIds =
      manual?.skillIds ??
      aiSelection?.selectedSkills ??
      data.skills.slice(0, request.maxSkills).map((item) => item.id);
    const projectIds =
      manual?.projectIds ??
      aiSelection?.selectedProjects ??
      data.projects.slice(0, request.maxProjects).map((item) => item.id);
    const certificationIds =
      manual?.certificationIds ??
      aiSelection?.selectedCertifications ??
      data.certifications.map((item) => item.id);
    const achievementIds =
      manual?.achievementIds ??
      aiSelection?.selectedAchievements ??
      data.achievements.map((item) => item.id);
    if (aiSelection) {
      aiSelection = {
        ...aiSelection,
        selectedWorkExperiences: workIds,
        selectedEducation: educationIds,
        selectedSkills: skillIds,
        selectedProjects: projectIds,
        selectedCertifications: certificationIds,
        selectedAchievements: achievementIds,
      };
    }
    // Overrides apply only to their supplied section; unspecified sections retain AI selection.
    const filtered = {
      ...data,
      skills: data.skills.filter((item) => skillIds.includes(item.id)),
    };
    const selection: ResumeContentSelection = {
      includePersonalInfo: true,
      includeSummary: true,
      includeWorkExperience: true,
      workExperienceIds: workIds,
      includeEducation: true,
      educationIds,
      includeSkills: true,
      includeProjects: true,
      projectIds,
      includeCertifications: true,
      certificationIds,
      includeAchievements: true,
      achievementIds,
      includeReferences: false,
    };
    const result = await this.generate(
      filtered,
      selection,
      request,
      signal,
      aiSelection,
      application.jobDescription,
    );
    if (request.useAISelection && !aiSelection)
      result.fit.warnings.push(
        "AI content selection was unavailable. Recent profile entries were used.",
      );
    return result;
  }

  async validateResumeGeneration(
    userId: string,
    request: GenerateResumeRequest,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const resumeData = await this.generateResumeData(userId);

      // Check if user has a profile
      if (!resumeData.profile && request.contentSelection.includePersonalInfo) {
        errors.push(
          "User profile is required when personal information is included",
        );
      }

      // Check if user has work experience when required
      if (
        request.contentSelection.includeWorkExperience &&
        resumeData.workExperiences.length === 0
      ) {
        errors.push(
          "No work experience found. Add work experience or disable it in content selection",
        );
      }

      // Check if user has education when required
      if (
        request.contentSelection.includeEducation &&
        resumeData.education.length === 0
      ) {
        errors.push(
          "No education found. Add education or disable it in content selection",
        );
      }

      // Check if user has skills when required
      if (
        request.contentSelection.includeSkills &&
        resumeData.skills.length === 0
      ) {
        errors.push(
          "No skills found. Add skills or disable them in content selection",
        );
      }

      // Check specific ID selections
      if (request.contentSelection.workExperienceIds) {
        const availableIds = resumeData.workExperiences.map((exp) => exp.id);
        const missingIds = request.contentSelection.workExperienceIds.filter(
          (id) => !availableIds.includes(id),
        );
        if (missingIds.length > 0) {
          errors.push(
            `Work experience IDs not found: ${missingIds.join(", ")}`,
          );
        }
      }

      if (request.contentSelection.educationIds) {
        const availableIds = resumeData.education.map((edu) => edu.id);
        const missingIds = request.contentSelection.educationIds.filter(
          (id) => !availableIds.includes(id),
        );
        if (missingIds.length > 0) {
          errors.push(`Education IDs not found: ${missingIds.join(", ")}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch {
      errors.push("Failed to validate resume data");
      return { valid: false, errors };
    }
  }
}
