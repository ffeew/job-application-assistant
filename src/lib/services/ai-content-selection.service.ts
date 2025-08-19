import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { env } from "@/lib/env";
import type {
  UserProfileResponse,
  WorkExperienceResponse,
  EducationResponse,
  SkillResponse,
  ProjectResponse,
  CertificationResponse,
  AchievementResponse,
} from "@/lib/validators/profile.validator";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

// Zod schemas for AI response validation
const jobAnalysisSchema = z.object({
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  seniority: z.enum(['entry', 'mid', 'senior', 'executive']),
  industry: z.string(),
  summary: z.string(),
});

const contentRelevanceScoreSchema = z.object({
  id: z.number(),
  type: z.enum(['work', 'education', 'skill', 'project', 'certification', 'achievement']),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  matchedKeywords: z.array(z.string()),
});

const intelligentContentSelectionSchema = z.object({
  selectedWorkExperiences: z.array(z.number()),
  selectedEducation: z.array(z.number()),
  selectedSkills: z.array(z.number()),
  selectedProjects: z.array(z.number()),
  selectedCertifications: z.array(z.number()),
  selectedAchievements: z.array(z.number()),
  relevanceScores: z.array(contentRelevanceScoreSchema),
  overallStrategy: z.string(),
  keyMatchingPoints: z.array(z.string()),
});

interface ProfileData {
  profile: UserProfileResponse | null;
  workExperiences: WorkExperienceResponse[];
  education: EducationResponse[];
  skills: SkillResponse[];
  projects: ProjectResponse[];
  certifications: CertificationResponse[];
  achievements: AchievementResponse[];
}

interface ContentRelevanceScore {
  id: number;
  type: 'work' | 'education' | 'skill' | 'project' | 'certification' | 'achievement';
  score: number; // 0-100
  reasoning: string;
  matchedKeywords: string[];
}

interface IntelligentContentSelection {
  selectedWorkExperiences: number[];
  selectedEducation: number[];
  selectedSkills: number[];
  selectedProjects: number[];
  selectedCertifications: number[];
  selectedAchievements: number[];
  relevanceScores: ContentRelevanceScore[];
  overallStrategy: string;
  keyMatchingPoints: string[];
}

export class AIContentSelectionService {
  private model = env.GROQ_MODEL || "openai/gpt-oss-120b";

  async analyzeJobDescription(jobDescription: string): Promise<z.infer<typeof jobAnalysisSchema>> {
    const prompt = `Analyze this job description and extract key information:

JOB DESCRIPTION:
${jobDescription}

Focus on technical skills, qualifications, experience requirements, and key responsibilities. Be concise and specific.`;

    try {
      const { object } = await generateObject({
        model: groq(this.model),
        schema: jobAnalysisSchema,
        prompt,
        temperature: 0.3,
      });

      return object;
    } catch (error) {
      console.error("Error analyzing job description:", error);
      throw new Error("Failed to analyze job description");
    }
  }

  async selectOptimalContent(
    jobDescription: string,
    profileData: ProfileData,
    maxWorkExperiences: number = 4,
    maxProjects: number = 3,
    maxSkills: number = 12
  ): Promise<IntelligentContentSelection> {
    // First analyze the job description
    const jobAnalysis = await this.analyzeJobDescription(jobDescription);

    // Create content scoring prompt
    const contentPrompt = this.buildContentScoringPrompt(
      jobDescription,
      jobAnalysis,
      profileData,
      { maxWorkExperiences, maxProjects, maxSkills }
    );

    try {
      const { object } = await generateObject({
        model: groq(this.model),
        schema: intelligentContentSelectionSchema,
        prompt: contentPrompt,
        temperature: 0.2,
      });

      return this.validateAndFormatSelection(object, profileData);
    } catch (error) {
      console.error("Error selecting optimal content:", error);
      // Return fallback selection
      return this.getFallbackSelection(profileData, maxWorkExperiences, maxProjects, maxSkills);
    }
  }

  private buildContentScoringPrompt(
    jobDescription: string,
    jobAnalysis: {
      requirements?: string[];
      skills?: string[];
      seniority?: string;
      industry?: string;
    },
    profileData: ProfileData,
    limits: { maxWorkExperiences: number; maxProjects: number; maxSkills: number; }
  ): string {
    return `You are an expert resume optimization AI. Analyze the job description and select the most relevant profile content to maximize interview success.

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS: ${jobAnalysis.requirements?.join(', ') || 'None specified'}
REQUIRED SKILLS: ${jobAnalysis.skills?.join(', ') || 'None specified'}
SENIORITY: ${jobAnalysis.seniority || 'Unknown'}
INDUSTRY: ${jobAnalysis.industry || 'Unknown'}

AVAILABLE PROFILE CONTENT:

WORK EXPERIENCES:
${profileData.workExperiences.map(exp => `ID: ${exp.id}
Title: ${exp.jobTitle}
Company: ${exp.company}
Duration: ${exp.startDate} - ${exp.endDate || 'Current'}
Description: ${exp.description || 'No description'}
Technologies: ${exp.technologies || 'Not specified'}
---`).join('\n')}

SKILLS:
${profileData.skills.map(skill => `ID: ${skill.id}
Name: ${skill.name}
Category: ${skill.category}
Level: ${skill.proficiencyLevel || 'Not specified'}
Experience: ${skill.yearsOfExperience || 0} years
---`).join('\n')}

PROJECTS:
${profileData.projects.map(project => `ID: ${project.id}
Title: ${project.title}
Description: ${project.description || 'No description'}
Technologies: ${project.technologies || 'Not specified'}
Duration: ${project.startDate} - ${project.endDate || 'Ongoing'}
---`).join('\n')}

EDUCATION:
${profileData.education.map(edu => `ID: ${edu.id}
Degree: ${edu.degree}
Field: ${edu.fieldOfStudy || 'Not specified'}
Institution: ${edu.institution}
Courses: ${edu.relevantCoursework || 'Not specified'}
---`).join('\n')}

CERTIFICATIONS:
${profileData.certifications.map(cert => `ID: ${cert.id}
Name: ${cert.name}
Issuer: ${cert.issuingOrganization}
Date: ${cert.issueDate || 'Unknown'}
---`).join('\n')}

ACHIEVEMENTS:
${profileData.achievements.map(ach => `ID: ${ach.id}
Title: ${ach.title}
Description: ${ach.description || 'No description'}
Organization: ${ach.organization || 'Not specified'}
---`).join('\n')}

SELECTION LIMITS:
- Max Work Experiences: ${limits.maxWorkExperiences}
- Max Projects: ${limits.maxProjects}
- Max Skills: ${limits.maxSkills}
- All Education: Include all relevant
- All Certifications: Include all relevant
- All Achievements: Include all relevant

Analyze the profile content and select the most relevant items for this job application. For each selected item, provide a relevance score (0-100), reasoning, and matched keywords.

Prioritize:
1. Direct skill matches
2. Relevant work experience 
3. Industry/domain experience
4. Seniority-appropriate content
5. Recent and significant achievements
6. Educational background relevance

Be selective - quality over quantity. Choose items that directly support the application.`;
  }

  private validateAndFormatSelection(
    selection: z.infer<typeof intelligentContentSelectionSchema>,
    profileData: ProfileData
  ): IntelligentContentSelection {
    // Ensure all required fields exist and contain valid IDs
    const validWorkIds = profileData.workExperiences.map(exp => exp.id);
    const validEducationIds = profileData.education.map(edu => edu.id);
    const validSkillIds = profileData.skills.map(skill => skill.id);
    const validProjectIds = profileData.projects.map(project => project.id);
    const validCertIds = profileData.certifications.map(cert => cert.id);
    const validAchievementIds = profileData.achievements.map(ach => ach.id);

    return {
      selectedWorkExperiences: selection.selectedWorkExperiences
        .filter(id => validWorkIds.includes(id)),
      selectedEducation: selection.selectedEducation
        .filter(id => validEducationIds.includes(id)),
      selectedSkills: selection.selectedSkills
        .filter(id => validSkillIds.includes(id)),
      selectedProjects: selection.selectedProjects
        .filter(id => validProjectIds.includes(id)),
      selectedCertifications: selection.selectedCertifications
        .filter(id => validCertIds.includes(id)),
      selectedAchievements: selection.selectedAchievements
        .filter(id => validAchievementIds.includes(id)),
      relevanceScores: selection.relevanceScores,
      overallStrategy: selection.overallStrategy,
      keyMatchingPoints: selection.keyMatchingPoints,
    };
  }

  private getFallbackSelection(
    profileData: ProfileData,
    maxWorkExperiences: number,
    maxProjects: number,
    maxSkills: number
  ): IntelligentContentSelection {
    // Fallback to most recent/relevant items if AI fails
    return {
      selectedWorkExperiences: profileData.workExperiences
        .slice(0, maxWorkExperiences)
        .map(exp => exp.id),
      selectedEducation: profileData.education.map(edu => edu.id),
      selectedSkills: profileData.skills
        .slice(0, maxSkills)
        .map(skill => skill.id),
      selectedProjects: profileData.projects
        .slice(0, maxProjects)
        .map(project => project.id),
      selectedCertifications: profileData.certifications.map(cert => cert.id),
      selectedAchievements: profileData.achievements.map(ach => ach.id),
      relevanceScores: [],
      overallStrategy: "Fallback selection - most recent content",
      keyMatchingPoints: ["Recent work experience", "All educational background", "Core skills"],
    };
  }
}