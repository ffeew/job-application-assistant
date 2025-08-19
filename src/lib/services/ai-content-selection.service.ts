import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
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

  async analyzeJobDescription(jobDescription: string): Promise<{
    requirements: string[];
    skills: string[];
    keywords: string[];
    seniority: 'entry' | 'mid' | 'senior' | 'executive';
    industry: string;
    summary: string;
  }> {
    const prompt = `Analyze this job description and extract key information:

JOB DESCRIPTION:
${jobDescription}

Please extract and return ONLY a JSON object with the following structure:
{
  "requirements": ["requirement1", "requirement2", ...],
  "skills": ["skill1", "skill2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "seniority": "entry|mid|senior|executive",
  "industry": "industry name",
  "summary": "brief summary of the role"
}

Focus on technical skills, qualifications, experience requirements, and key responsibilities. Be concise and specific.`;

    try {
      const { text } = await generateText({
        model: groq(this.model),
        prompt,
        temperature: 0.3,
      });

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Failed to parse job analysis response");
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
      const { text } = await generateText({
        model: groq(this.model),
        prompt: contentPrompt,
        temperature: 0.2,
      });

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return this.validateAndFormatSelection(result, profileData);
      }

      throw new Error("Failed to parse content selection response");
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

Please analyze and return ONLY a JSON object with this structure:
{
  "selectedWorkExperiences": [id1, id2, ...],
  "selectedEducation": [id1, id2, ...],
  "selectedSkills": [id1, id2, ...],
  "selectedProjects": [id1, id2, ...],
  "selectedCertifications": [id1, id2, ...],
  "selectedAchievements": [id1, id2, ...],
  "relevanceScores": [
    {
      "id": number,
      "type": "work|education|skill|project|certification|achievement",
      "score": number, // 0-100
      "reasoning": "why this is relevant",
      "matchedKeywords": ["keyword1", "keyword2"]
    }
  ],
  "overallStrategy": "explanation of the selection strategy",
  "keyMatchingPoints": ["point1", "point2", "point3"]
}

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
    selection: {
      selectedWorkExperiences?: number[];
      selectedEducation?: number[];
      selectedSkills?: number[];
      selectedProjects?: number[];
      selectedCertifications?: number[];
      selectedAchievements?: number[];
      relevanceScores?: ContentRelevanceScore[];
      overallStrategy?: string;
      keyMatchingPoints?: string[];
    },
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
      selectedWorkExperiences: (selection.selectedWorkExperiences || [])
        .filter((id: number) => validWorkIds.includes(id)),
      selectedEducation: (selection.selectedEducation || [])
        .filter((id: number) => validEducationIds.includes(id)),
      selectedSkills: (selection.selectedSkills || [])
        .filter((id: number) => validSkillIds.includes(id)),
      selectedProjects: (selection.selectedProjects || [])
        .filter((id: number) => validProjectIds.includes(id)),
      selectedCertifications: (selection.selectedCertifications || [])
        .filter((id: number) => validCertIds.includes(id)),
      selectedAchievements: (selection.selectedAchievements || [])
        .filter((id: number) => validAchievementIds.includes(id)),
      relevanceScores: selection.relevanceScores || [],
      overallStrategy: selection.overallStrategy || "No strategy provided",
      keyMatchingPoints: selection.keyMatchingPoints || [],
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