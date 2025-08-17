import puppeteer from 'puppeteer';
import { ProfileService } from './profile.service';
import { generateProfessionalResumeHTML } from '@/lib/resume-templates/professional-html';
import type {
  GenerateResumeRequest,
  UserProfileResponse,
  WorkExperienceResponse,
  EducationResponse,
  SkillResponse,
  ProjectResponse,
  CertificationResponse,
  AchievementResponse,
} from '@/lib/validators/profile.validator';

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

  async validateResumeGeneration(userId: string, request: GenerateResumeRequest): Promise<{ valid: boolean; errors: string[] }> {
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
}