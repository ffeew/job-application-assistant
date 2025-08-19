import { z } from "zod";

// User Profile Schema
export const userProfileSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.email({ message: "Invalid email format" }).nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable(),
  linkedinUrl: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  githubUrl: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  portfolioUrl: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  professionalSummary: z.string().nullable(),
});

export const createUserProfileSchema = userProfileSchema;
export const updateUserProfileSchema = userProfileSchema.partial();

export const userProfileResponseSchema = userProfileSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Work Experience Schema
export const workExperienceSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format"),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  isCurrent: z.boolean().default(false),
  description: z.string().nullable(),
  technologies: z.string().nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createWorkExperienceSchema = workExperienceSchema;
export const updateWorkExperienceSchema = workExperienceSchema.partial();

export const workExperienceResponseSchema = workExperienceSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Education Schema
export const educationSchema = z.object({
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string().nullable(),
  institution: z.string().min(1, "Institution is required"),
  location: z.string().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  gpa: z.string().nullable(),
  honors: z.string().nullable(),
  relevantCoursework: z.string().nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createEducationSchema = educationSchema;
export const updateEducationSchema = educationSchema.partial();

export const educationResponseSchema = educationSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Skills Schema
export const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.enum(["technical", "soft", "language", "tool", "framework", "other"]),
  proficiencyLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).nullable(),
  yearsOfExperience: z.number().int().min(0).nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createSkillSchema = skillSchema;
export const updateSkillSchema = skillSchema.partial();

export const skillResponseSchema = skillSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Projects Schema
export const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().nullable(),
  technologies: z.string().nullable(),
  projectUrl: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  githubUrl: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  isOngoing: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

export const createProjectSchema = projectSchema;
export const updateProjectSchema = projectSchema.partial();

export const projectResponseSchema = projectSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Certifications Schema
export const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuingOrganization: z.string().min(1, "Issuing organization is required"),
  issueDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  credentialId: z.string().nullable(),
  credentialUrl: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  displayOrder: z.number().int().min(0).default(0),
});

export const createCertificationSchema = certificationSchema;
export const updateCertificationSchema = certificationSchema.partial();

export const certificationResponseSchema = certificationSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Achievements Schema
export const achievementSchema = z.object({
  title: z.string().min(1, "Achievement title is required"),
  description: z.string().nullable(),
  organization: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}$/, "Date must be in YYYY-MM format").nullable(),
  url: z.url({ message: "Invalid URL format" }).nullable().or(z.literal("")),
  displayOrder: z.number().int().min(0).default(0),
});

export const createAchievementSchema = achievementSchema;
export const updateAchievementSchema = achievementSchema.partial();

export const achievementResponseSchema = achievementSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// References Schema
export const referenceSchema = z.object({
  name: z.string().min(1, "Reference name is required"),
  title: z.string().nullable(),
  company: z.string().nullable(),
  email: z.email({ message: "Invalid email format" }).nullable(),
  phone: z.string().nullable(),
  relationship: z.enum(["manager", "colleague", "client", "professor", "mentor", "other"]).nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createReferenceSchema = referenceSchema;
export const updateReferenceSchema = referenceSchema.partial();

export const referenceResponseSchema = referenceSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Query Schemas
export const profileQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
  category: z.string().optional(), // For skills filtering
  orderBy: z.enum(["displayOrder", "createdAt", "updatedAt"]).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// Bulk operations
export const bulkUpdateOrderSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    displayOrder: z.number().int().min(0),
  })).min(1),
});

// Resume generation schemas
export const resumeContentSelectionSchema = z.object({
  includePersonalInfo: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  includeWorkExperience: z.boolean().default(true),
  workExperienceIds: z.array(z.number()).optional(),
  includeEducation: z.boolean().default(true),
  educationIds: z.array(z.number()).optional(),
  includeSkills: z.boolean().default(true),
  skillCategories: z.array(z.string()).optional(),
  includeProjects: z.boolean().default(false),
  projectIds: z.array(z.number()).optional(),
  includeCertifications: z.boolean().default(false),
  certificationIds: z.array(z.number()).optional(),
  includeAchievements: z.boolean().default(false),
  achievementIds: z.array(z.number()).optional(),
  includeReferences: z.boolean().default(false),
  referenceIds: z.array(z.number()).optional(),
});

export const generateResumeSchema = z.object({
  title: z.string().min(1, "Resume title is required"),
  template: z.enum(["professional", "modern", "minimal", "creative"]).default("professional"),
  contentSelection: resumeContentSelectionSchema,
});

// AI-powered resume generation schemas
export const contentRelevanceScoreSchema = z.object({
  id: z.number(),
  type: z.enum(['work', 'education', 'skill', 'project', 'certification', 'achievement']),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  matchedKeywords: z.array(z.string()),
});

export const intelligentContentSelectionSchema = z.object({
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

export const jobApplicationResumeRequestSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  title: z.string().min(1, "Resume title is required"),
  template: z.enum(["professional", "modern", "minimal", "creative"]).default("professional"),
  useAISelection: z.boolean().default(true),
  maxWorkExperiences: z.number().int().min(1).max(10).default(4),
  maxProjects: z.number().int().min(0).max(8).default(3),
  maxSkills: z.number().int().min(5).max(20).default(12),
  manualOverrides: z.object({
    workExperienceIds: z.array(z.number()).optional(),
    educationIds: z.array(z.number()).optional(),
    skillIds: z.array(z.number()).optional(),
    projectIds: z.array(z.number()).optional(),
    certificationIds: z.array(z.number()).optional(),
    achievementIds: z.array(z.number()).optional(),
  }).optional(),
});

export const jobAnalysisResponseSchema = z.object({
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  seniority: z.enum(['entry', 'mid', 'senior', 'executive']),
  industry: z.string(),
  summary: z.string(),
});

// Type exports
export type CreateUserProfileRequest = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

export type CreateWorkExperienceRequest = z.infer<typeof createWorkExperienceSchema>;
export type UpdateWorkExperienceRequest = z.infer<typeof updateWorkExperienceSchema>;
export type WorkExperienceResponse = z.infer<typeof workExperienceResponseSchema>;

export type CreateEducationRequest = z.infer<typeof createEducationSchema>;
export type UpdateEducationRequest = z.infer<typeof updateEducationSchema>;
export type EducationResponse = z.infer<typeof educationResponseSchema>;

export type CreateSkillRequest = z.infer<typeof createSkillSchema>;
export type UpdateSkillRequest = z.infer<typeof updateSkillSchema>;
export type SkillResponse = z.infer<typeof skillResponseSchema>;

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export type CreateCertificationRequest = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationRequest = z.infer<typeof updateCertificationSchema>;
export type CertificationResponse = z.infer<typeof certificationResponseSchema>;

export type CreateAchievementRequest = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementRequest = z.infer<typeof updateAchievementSchema>;
export type AchievementResponse = z.infer<typeof achievementResponseSchema>;

export type CreateReferenceRequest = z.infer<typeof createReferenceSchema>;
export type UpdateReferenceRequest = z.infer<typeof updateReferenceSchema>;
export type ReferenceResponse = z.infer<typeof referenceResponseSchema>;

export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export type BulkUpdateOrderRequest = z.infer<typeof bulkUpdateOrderSchema>;
export type ResumeContentSelection = z.infer<typeof resumeContentSelectionSchema>;
export type GenerateResumeRequest = z.infer<typeof generateResumeSchema>;

// AI-powered resume generation types
export type ContentRelevanceScore = z.infer<typeof contentRelevanceScoreSchema>;
export type IntelligentContentSelection = z.infer<typeof intelligentContentSelectionSchema>;
export type JobApplicationResumeRequest = z.infer<typeof jobApplicationResumeRequestSchema>;
export type JobAnalysisResponse = z.infer<typeof jobAnalysisResponseSchema>;