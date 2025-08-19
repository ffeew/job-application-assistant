import puppeteer from 'puppeteer';
import { ProfileService } from './profile.service';
import { AIContentSelectionService } from './ai-content-selection.service';
import { generateProfessionalResumeHTML } from '@/lib/resume-templates/professional-html';
import type {
  GenerateResumeRequest,
  JobApplicationResumeRequest,
  UserProfileResponse,
  WorkExperienceResponse,
  EducationResponse,
  SkillResponse,
  ProjectResponse,
  CertificationResponse,
  AchievementResponse,
  IntelligentContentSelection,
} from '@/lib/validators/profile.validator';
import type { ApplicationResponse } from '@/lib/validators/applications.validator';

interface ResumeData {
  profile: UserProfileResponse | null;
  workExperiences: WorkExperienceResponse[];
  education: EducationResponse[];
  skills: SkillResponse[];
  projects: ProjectResponse[];
  certifications: CertificationResponse[];
  achievements: AchievementResponse[];
}

export class ResumeGenerationService {
  private profileService = new ProfileService();
  private aiContentService = new AIContentSelectionService();

  async generateResumeData(userId: string): Promise<ResumeData> {
    // Fetch all profile data
    const [
      profile,
      workExperiences,
      education,
      skills,
      projects,
      certifications,
      achievements,
    ] = await Promise.all([
      this.profileService.getUserProfile(userId),
      this.profileService.getWorkExperiences(userId, { orderBy: 'displayOrder', order: 'asc' }),
      this.profileService.getEducation(userId, { orderBy: 'displayOrder', order: 'asc' }),
      this.profileService.getSkills(userId, { orderBy: 'displayOrder', order: 'asc' }),
      this.profileService.getProjects(userId, { orderBy: 'displayOrder', order: 'asc' }),
      this.profileService.getCertifications(userId, { orderBy: 'displayOrder', order: 'asc' }),
      this.profileService.getAchievements(userId, { orderBy: 'displayOrder', order: 'asc' }),
    ]);

    return {
      profile,
      workExperiences,
      education,
      skills,
      projects,
      certifications,
      achievements,
    };
  }

  async generateResumeHTML(userId: string, request: GenerateResumeRequest): Promise<string> {
    const resumeData = await this.generateResumeData(userId);

    // Select the appropriate template generator
    switch (request.template) {
      case 'professional':
      default:
        return generateProfessionalResumeHTML(
          { ...resumeData, contentSelection: request.contentSelection },
          request.title
        );
      // Add more templates here as they are created
    }
  }

  async generateResumePDF(userId: string, request: GenerateResumeRequest): Promise<Buffer> {
    const html = await this.generateResumeHTML(userId, request);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();

      // Set content and wait for it to load
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Generate PDF with specific settings for resume
      const pdfBuffer = await page.pdf({
        format: 'letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
          right: '0.5in'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async validateResumeGeneration(userId: string, request: GenerateResumeRequest): Promise<{ valid: boolean; errors: string[]; }> {
    const errors: string[] = [];

    try {
      const resumeData = await this.generateResumeData(userId);

      // Check if user has a profile
      if (!resumeData.profile && request.contentSelection.includePersonalInfo) {
        errors.push('User profile is required when personal information is included');
      }

      // Check if user has work experience when required
      if (request.contentSelection.includeWorkExperience && resumeData.workExperiences.length === 0) {
        errors.push('No work experience found. Add work experience or disable it in content selection');
      }

      // Check if user has education when required
      if (request.contentSelection.includeEducation && resumeData.education.length === 0) {
        errors.push('No education found. Add education or disable it in content selection');
      }

      // Check if user has skills when required
      if (request.contentSelection.includeSkills && resumeData.skills.length === 0) {
        errors.push('No skills found. Add skills or disable them in content selection');
      }

      // Check specific ID selections
      if (request.contentSelection.workExperienceIds) {
        const availableIds = resumeData.workExperiences.map(exp => exp.id);
        const missingIds = request.contentSelection.workExperienceIds.filter(id => !availableIds.includes(id));
        if (missingIds.length > 0) {
          errors.push(`Work experience IDs not found: ${missingIds.join(', ')}`);
        }
      }

      if (request.contentSelection.educationIds) {
        const availableIds = resumeData.education.map(edu => edu.id);
        const missingIds = request.contentSelection.educationIds.filter(id => !availableIds.includes(id));
        if (missingIds.length > 0) {
          errors.push(`Education IDs not found: ${missingIds.join(', ')}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch {
      errors.push('Failed to validate resume data');
      return { valid: false, errors };
    }
  }

  async generatePreviewHTML(userId: string, request: GenerateResumeRequest): Promise<string> {
    // Same as generateResumeHTML but with additional CSS for web preview
    const html = await this.generateResumeHTML(userId, request);

    // Add preview-specific styles
    const previewHTML = html.replace(
      '</style>',
      `
        .resume-container {
          box-shadow: 0 0 20px rgba(0,0,0,0.1) !important;
          margin: 20px auto !important;
          background: white !important;
          border: 1px solid #ddd !important;
        }
        
        body {
          background: #f5f5f5 !important;
          padding: 20px !important;
        }
      </style>`
    );

    return previewHTML;
  }

  // NEW: Job-application-linked resume generation methods
  async generateJobApplicationResumeHTML(
    userId: string,
    application: ApplicationResponse,
    request: JobApplicationResumeRequest
  ): Promise<{ html: string; aiSelection?: IntelligentContentSelection; }> {
    const resumeData = await this.generateResumeData(userId);
    let aiSelection: IntelligentContentSelection | undefined;
    let filteredResumeData = resumeData;

    // Use AI content selection if enabled and job description is available
    if (request.useAISelection && application.jobDescription) {
      try {
        aiSelection = await this.aiContentService.selectOptimalContent(
          application.jobDescription,
          resumeData,
          request.maxWorkExperiences,
          request.maxProjects,
          request.maxSkills
        );

        // Filter resume data based on AI selection
        filteredResumeData = this.applyIntelligentSelection(resumeData, aiSelection);
      } catch (error) {
        console.error('Error with AI content selection, falling back to manual/default selection:', error);
        // Fall through to manual selection
      }
    }

    // Apply manual overrides if provided
    if (request.manualOverrides) {
      filteredResumeData = this.applyManualOverrides(resumeData, request.manualOverrides);
    }

    // Generate content selection for template
    const contentSelection = this.createContentSelectionFromData(filteredResumeData);

    // Generate HTML using the existing template system
    const html = await this.generateResumeHTMLWithData(
      filteredResumeData,
      contentSelection,
      request.template,
      request.title
    );

    return { html, aiSelection };
  }

  async generateJobApplicationResumePDF(
    userId: string,
    application: ApplicationResponse,
    request: JobApplicationResumeRequest
  ): Promise<{ pdf: Buffer; aiSelection?: IntelligentContentSelection; }> {
    const { html, aiSelection } = await this.generateJobApplicationResumeHTML(userId, application, request);

    // Use the same PDF generation logic as existing method
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Add additional wait to ensure content is fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
          right: '0.5in'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      return { pdf: Buffer.from(pdfBuffer), aiSelection };
    } finally {
      await browser.close();
    }
  }

  async generateJobApplicationPreviewHTML(
    userId: string,
    application: ApplicationResponse,
    request: JobApplicationResumeRequest
  ): Promise<{ html: string; aiSelection?: IntelligentContentSelection; }> {
    const { html, aiSelection } = await this.generateJobApplicationResumeHTML(userId, application, request);

    // Add preview-specific styles
    const previewHTML = html.replace(
      '</style>',
      `
        .resume-container {
          box-shadow: 0 0 20px rgba(0,0,0,0.1) !important;
          margin: 20px auto !important;
          background: white !important;
          border: 1px solid #ddd !important;
        }
        
        body {
          background: #f5f5f5 !important;
          padding: 20px !important;
        }
      </style>`
    );

    return { html: previewHTML, aiSelection };
  }

  // Helper methods for AI content selection integration
  private applyIntelligentSelection(
    resumeData: ResumeData,
    aiSelection: IntelligentContentSelection
  ): ResumeData {
    return {
      profile: resumeData.profile,
      workExperiences: resumeData.workExperiences.filter(exp =>
        aiSelection.selectedWorkExperiences.includes(exp.id)
      ),
      education: resumeData.education.filter(edu =>
        aiSelection.selectedEducation.includes(edu.id)
      ),
      skills: resumeData.skills.filter(skill =>
        aiSelection.selectedSkills.includes(skill.id)
      ),
      projects: resumeData.projects.filter(project =>
        aiSelection.selectedProjects.includes(project.id)
      ),
      certifications: resumeData.certifications.filter(cert =>
        aiSelection.selectedCertifications.includes(cert.id)
      ),
      achievements: resumeData.achievements.filter(achievement =>
        aiSelection.selectedAchievements.includes(achievement.id)
      ),
    };
  }

  private applyManualOverrides(
    resumeData: ResumeData,
    overrides: JobApplicationResumeRequest['manualOverrides']
  ): ResumeData {
    if (!overrides) return resumeData;

    return {
      profile: resumeData.profile,
      workExperiences: overrides.workExperienceIds
        ? resumeData.workExperiences.filter(exp => overrides.workExperienceIds!.includes(exp.id))
        : resumeData.workExperiences,
      education: overrides.educationIds
        ? resumeData.education.filter(edu => overrides.educationIds!.includes(edu.id))
        : resumeData.education,
      skills: overrides.skillIds
        ? resumeData.skills.filter(skill => overrides.skillIds!.includes(skill.id))
        : resumeData.skills,
      projects: overrides.projectIds
        ? resumeData.projects.filter(project => overrides.projectIds!.includes(project.id))
        : resumeData.projects,
      certifications: overrides.certificationIds
        ? resumeData.certifications.filter(cert => overrides.certificationIds!.includes(cert.id))
        : resumeData.certifications,
      achievements: overrides.achievementIds
        ? resumeData.achievements.filter(achievement => overrides.achievementIds!.includes(achievement.id))
        : resumeData.achievements,
    };
  }

  private createContentSelectionFromData(resumeData: ResumeData) {
    return {
      includePersonalInfo: !!resumeData.profile,
      includeSummary: !!(resumeData.profile?.professionalSummary),
      includeWorkExperience: resumeData.workExperiences.length > 0,
      workExperienceIds: resumeData.workExperiences.map(exp => exp.id),
      includeEducation: resumeData.education.length > 0,
      educationIds: resumeData.education.map(edu => edu.id),
      includeSkills: resumeData.skills.length > 0,
      skillCategories: [...new Set(resumeData.skills.map(skill => skill.category))],
      includeProjects: resumeData.projects.length > 0,
      projectIds: resumeData.projects.map(project => project.id),
      includeCertifications: resumeData.certifications.length > 0,
      certificationIds: resumeData.certifications.map(cert => cert.id),
      includeAchievements: resumeData.achievements.length > 0,
      achievementIds: resumeData.achievements.map(achievement => achievement.id),
      includeReferences: false, // Usually not included in AI-generated resumes
      referenceIds: [],
    };
  }

  private async generateResumeHTMLWithData(
    resumeData: ResumeData,
    contentSelection: {
      includePersonalInfo: boolean;
      includeSummary: boolean;
      includeWorkExperience: boolean;
      workExperienceIds: number[];
      includeEducation: boolean;
      educationIds: number[];
      includeSkills: boolean;
      skillCategories: string[];
      includeProjects: boolean;
      projectIds: number[];
      includeCertifications: boolean;
      certificationIds: number[];
      includeAchievements: boolean;
      achievementIds: number[];
      includeReferences: boolean;
      referenceIds: number[];
    },
    template: string,
    title: string
  ): Promise<string> {
    // Use existing template generation logic
    switch (template) {
      case 'professional':
      default:
        return generateProfessionalResumeHTML(
          { ...resumeData, contentSelection },
          title
        );
      // Add more templates here as they are created
    }
  }
}