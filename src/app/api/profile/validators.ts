import { z } from "zod";
import { profileRecordFields } from "@/lib/validators/transport";
import {
  longText,
  monthSchema,
  optionalEmail,
  optionalMonth,
  optionalUrl,
  shortText,
} from "@/lib/validators/fields";

export const userProfileSchema = z.object({
  firstName: shortText.nullable(),
  lastName: shortText.nullable(),
  email: optionalEmail,
  phone: shortText.nullable(),
  address: shortText.nullable(),
  city: shortText.nullable(),
  state: shortText.nullable(),
  zipCode: shortText.nullable(),
  country: shortText.nullable(),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  professionalSummary: longText.nullable(),
});

export const createUserProfileSchema = userProfileSchema;
export const updateUserProfileSchema = userProfileSchema.partial();

export const userProfileResponseSchema = userProfileSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const workExperienceSchema = z.object({
  jobTitle: shortText.min(1, "Job title is required"),
  company: shortText.min(1, "Company is required"),
  location: shortText.nullable(),
  startDate: monthSchema,
  endDate: optionalMonth,
  isCurrent: z.boolean().default(false),
  description: longText.nullable(),
  technologies: longText.nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createWorkExperienceSchema = workExperienceSchema;
// Partial schemas keep field defaults, so an omitted key would overwrite the
// stored value on update. Defaulted fields are redeclared as plain optionals.
export const updateWorkExperienceSchema = workExperienceSchema.partial().extend({
  isCurrent: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const workExperienceResponseSchema = workExperienceSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const educationSchema = z.object({
  degree: shortText.min(1, "Degree is required"),
  fieldOfStudy: shortText.nullable(),
  institution: shortText.min(1, "Institution is required"),
  location: shortText.nullable(),
  startDate: optionalMonth,
  endDate: optionalMonth,
  gpa: shortText.nullable(),
  honors: longText.nullable(),
  relevantCoursework: longText.nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createEducationSchema = educationSchema;
export const updateEducationSchema = educationSchema.partial().extend({
  displayOrder: z.number().int().min(0).optional(),
});

export const educationResponseSchema = educationSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const skillSchema = z.object({
  name: shortText.min(1, "Skill name is required"),
  category: z.enum([
    "technical",
    "soft",
    "language",
    "tool",
    "framework",
    "other",
  ]),
  proficiencyLevel: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .nullable(),
  yearsOfExperience: z.number().int().min(0).nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createSkillSchema = skillSchema;
export const updateSkillSchema = skillSchema.partial().extend({
  displayOrder: z.number().int().min(0).optional(),
});

export const skillResponseSchema = skillSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectSchema = z.object({
  title: shortText.min(1, "Project title is required"),
  description: longText.nullable(),
  technologies: longText.nullable(),
  projectUrl: optionalUrl,
  githubUrl: optionalUrl,
  startDate: optionalMonth,
  endDate: optionalMonth,
  isOngoing: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});

export const createProjectSchema = projectSchema;
export const updateProjectSchema = projectSchema.partial().extend({
  isOngoing: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const projectResponseSchema = projectSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const certificationSchema = z.object({
  name: shortText.min(1, "Certification name is required"),
  issuingOrganization: shortText.min(1, "Issuing organization is required"),
  issueDate: optionalMonth,
  expirationDate: optionalMonth,
  credentialId: shortText.nullable(),
  credentialUrl: optionalUrl,
  displayOrder: z.number().int().min(0).default(0),
});

export const createCertificationSchema = certificationSchema;
export const updateCertificationSchema = certificationSchema.partial().extend({
  displayOrder: z.number().int().min(0).optional(),
});

export const certificationResponseSchema = certificationSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const achievementSchema = z.object({
  title: shortText.min(1, "Achievement title is required"),
  description: longText.nullable(),
  organization: shortText.nullable(),
  date: optionalMonth,
  url: optionalUrl,
  displayOrder: z.number().int().min(0).default(0),
});

export const createAchievementSchema = achievementSchema;
export const updateAchievementSchema = achievementSchema.partial().extend({
  displayOrder: z.number().int().min(0).optional(),
});

export const achievementResponseSchema = achievementSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const referenceSchema = z.object({
  name: shortText.min(1, "Reference name is required"),
  title: shortText.nullable(),
  company: shortText.nullable(),
  email: optionalEmail,
  phone: shortText.nullable(),
  relationship: z
    .enum(["manager", "colleague", "client", "professor", "mentor", "other"])
    .nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createReferenceSchema = referenceSchema;
export const updateReferenceSchema = referenceSchema.partial().extend({
  displayOrder: z.number().int().min(0).optional(),
});

export const referenceResponseSchema = referenceSchema.extend({
  id: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Stored values may predate form constraints; transport validation must still accept them.
export const userProfileJsonResponseSchema = z.object({
  ...profileRecordFields,
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

export const workExperienceJsonResponseSchema = z.object({
  ...profileRecordFields,
  jobTitle: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
  technologies: z.string().nullable(),
  displayOrder: z.number(),
});

export const educationJsonResponseSchema = z.object({
  ...profileRecordFields,
  degree: z.string(),
  fieldOfStudy: z.string().nullable(),
  institution: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  gpa: z.string().nullable(),
  honors: z.string().nullable(),
  relevantCoursework: z.string().nullable(),
  displayOrder: z.number(),
});

export const skillJsonResponseSchema = z.object({
  ...profileRecordFields,
  name: z.string(),
  category: skillSchema.shape.category,
  proficiencyLevel: skillSchema.shape.proficiencyLevel,
  yearsOfExperience: z.number().nullable(),
  displayOrder: z.number(),
});

export const projectJsonResponseSchema = z.object({
  ...profileRecordFields,
  title: z.string(),
  description: z.string().nullable(),
  technologies: z.string().nullable(),
  projectUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isOngoing: z.boolean(),
  displayOrder: z.number(),
});

export const certificationJsonResponseSchema = z.object({
  ...profileRecordFields,
  name: z.string(),
  issuingOrganization: z.string(),
  issueDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  credentialId: z.string().nullable(),
  credentialUrl: z.string().nullable(),
  displayOrder: z.number(),
});

export const achievementJsonResponseSchema = z.object({
  ...profileRecordFields,
  title: z.string(),
  description: z.string().nullable(),
  organization: z.string().nullable(),
  date: z.string().nullable(),
  url: z.string().nullable(),
  displayOrder: z.number(),
});

export const referenceJsonResponseSchema = z.object({
  ...profileRecordFields,
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  relationship: referenceSchema.shape.relationship,
  displayOrder: z.number(),
});

export type UserProfileJsonResponse = z.infer<
  typeof userProfileJsonResponseSchema
>;
export type WorkExperienceJsonResponse = z.infer<
  typeof workExperienceJsonResponseSchema
>;
export type EducationJsonResponse = z.infer<typeof educationJsonResponseSchema>;
export type SkillJsonResponse = z.infer<typeof skillJsonResponseSchema>;
export type ProjectJsonResponse = z.infer<typeof projectJsonResponseSchema>;
export type CertificationJsonResponse = z.infer<
  typeof certificationJsonResponseSchema
>;
export type AchievementJsonResponse = z.infer<
  typeof achievementJsonResponseSchema
>;
export type ReferenceJsonResponse = z.infer<typeof referenceJsonResponseSchema>;

export const profileQuerySchema = z.object({
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional(),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().int().nonnegative())
    .optional(),
  category: z.string().optional(),
  orderBy: z.enum(["displayOrder", "createdAt", "updatedAt"]).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// A profile holds at most a few hundred entries, so a longer list is not a selection.
const MAX_SELECTED_IDS = 500;

export const bulkUpdateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(MAX_SELECTED_IDS),
});

const selectedIds = z.array(z.number().int()).max(MAX_SELECTED_IDS);

export const resumeContentSelectionSchema = z.object({
  includePersonalInfo: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  includeWorkExperience: z.boolean().default(true),
  workExperienceIds: selectedIds.optional(),
  includeEducation: z.boolean().default(true),
  educationIds: selectedIds.optional(),
  includeSkills: z.boolean().default(true),
  skillCategories: z.array(shortText).max(20).optional(),
  includeProjects: z.boolean().default(false),
  projectIds: selectedIds.optional(),
  includeCertifications: z.boolean().default(false),
  certificationIds: selectedIds.optional(),
  includeAchievements: z.boolean().default(false),
  achievementIds: selectedIds.optional(),
  includeReferences: z.boolean().default(false),
  referenceIds: selectedIds.optional(),
});

export const generateResumeSchema = z.object({
  title: shortText.min(1, "Resume title is required"),
  targetPages: z.union([z.literal(1), z.literal(2)]).default(1),
  template: z
    .enum(["professional", "modern", "minimal", "creative"])
    .default("professional"),
  contentSelection: resumeContentSelectionSchema,
});

export const contentRelevanceScoreSchema = z.object({
  id: z.number(),
  type: z.enum([
    "work",
    "education",
    "skill",
    "project",
    "certification",
    "achievement",
  ]),
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
  applicationId: shortText.min(1, "Application ID is required"),
  title: shortText.min(1, "Resume title is required"),
  targetPages: z.union([z.literal(1), z.literal(2)]).default(1),
  template: z
    .enum(["professional", "modern", "minimal", "creative"])
    .default("professional"),
  useAISelection: z.boolean().default(true),
  maxWorkExperiences: z.number().int().min(1).max(10).default(4),
  maxProjects: z.number().int().min(0).max(8).default(3),
  maxSkills: z.number().int().min(5).max(20).default(12),
  manualOverrides: z
    .object({
      workExperienceIds: selectedIds.optional(),
      educationIds: selectedIds.optional(),
      skillIds: selectedIds.optional(),
      projectIds: selectedIds.optional(),
      certificationIds: selectedIds.optional(),
      achievementIds: selectedIds.optional(),
    })
    .optional(),
});

export const jobAnalysisResponseSchema = z.object({
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  seniority: z.enum(["entry", "mid", "senior", "executive"]),
  industry: z.string(),
  summary: z.string(),
});

export type CreateUserProfileRequest = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

export type CreateWorkExperienceRequest = z.infer<
  typeof createWorkExperienceSchema
>;
export type UpdateWorkExperienceRequest = z.infer<
  typeof updateWorkExperienceSchema
>;
export type WorkExperienceResponse = z.infer<
  typeof workExperienceResponseSchema
>;

export type CreateEducationRequest = z.infer<typeof createEducationSchema>;
export type UpdateEducationRequest = z.infer<typeof updateEducationSchema>;
export type EducationResponse = z.infer<typeof educationResponseSchema>;

export type CreateSkillRequest = z.infer<typeof createSkillSchema>;
export type UpdateSkillRequest = z.infer<typeof updateSkillSchema>;
export type SkillResponse = z.infer<typeof skillResponseSchema>;

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export type CreateCertificationRequest = z.infer<
  typeof createCertificationSchema
>;
export type UpdateCertificationRequest = z.infer<
  typeof updateCertificationSchema
>;
export type CertificationResponse = z.infer<typeof certificationResponseSchema>;

export type CreateAchievementRequest = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementRequest = z.infer<typeof updateAchievementSchema>;
export type AchievementResponse = z.infer<typeof achievementResponseSchema>;

export type CreateReferenceRequest = z.infer<typeof createReferenceSchema>;
export type UpdateReferenceRequest = z.infer<typeof updateReferenceSchema>;
export type ReferenceResponse = z.infer<typeof referenceResponseSchema>;

export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export type BulkUpdateOrderRequest = z.infer<typeof bulkUpdateOrderSchema>;
export type ResumeContentSelection = z.infer<
  typeof resumeContentSelectionSchema
>;
export type GenerateResumeRequest = z.infer<typeof generateResumeSchema>;

export type ContentRelevanceScore = z.infer<typeof contentRelevanceScoreSchema>;
export type IntelligentContentSelection = z.infer<
  typeof intelligentContentSelectionSchema
>;
export type JobApplicationResumeRequest = z.infer<
  typeof jobApplicationResumeRequestSchema
>;
export type JobAnalysisResponse = z.infer<typeof jobAnalysisResponseSchema>;
