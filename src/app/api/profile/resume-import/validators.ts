import { z } from "zod";

import { createUserProfileSchema } from "@/app/api/profile/validators";

const stringArraySchema = z.array(z.string().min(1)).optional().default([]);

export const resumeImportWorkExperienceSchema = z.object({
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean().nullable(),
  description: z.string().nullable(),
  technologies: stringArraySchema,
});

export const resumeImportEducationSchema = z.object({
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  institution: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  gpa: z.string().nullable(),
  honors: z.string().nullable(),
  relevantCoursework: stringArraySchema,
});

export const resumeImportSkillSchema = z.object({
  name: z.string().nullable(),
  category: z.string().nullable(),
  proficiencyLevel: z.string().nullable(),
  yearsOfExperience: z.number().nullable(),
});

export const resumeImportProjectSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  technologies: stringArraySchema,
  projectUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isOngoing: z.boolean().nullable(),
});

export const resumeImportCertificationSchema = z.object({
  name: z.string().nullable(),
  issuingOrganization: z.string().nullable(),
  issueDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  credentialId: z.string().nullable(),
  credentialUrl: z.string().nullable(),
});

export const resumeImportAchievementSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  organization: z.string().nullable(),
  date: z.string().nullable(),
  url: z.string().nullable(),
});

export const resumeImportReferenceSchema = z.object({
  name: z.string().nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  relationship: z.string().nullable(),
});

export const resumeImportResponseSchema = z.object({
  profile: createUserProfileSchema,
  workExperiences: z.array(resumeImportWorkExperienceSchema).default([]),
  education: z.array(resumeImportEducationSchema).default([]),
  skills: z.array(resumeImportSkillSchema).default([]),
  projects: z.array(resumeImportProjectSchema).default([]),
  certifications: z.array(resumeImportCertificationSchema).default([]),
  achievements: z.array(resumeImportAchievementSchema).default([]),
  references: z.array(resumeImportReferenceSchema).default([]),
  markdown: z.string().nullable(),
  warnings: z.array(z.string()).default([]),
});

export type ResumeImportResponse = z.infer<typeof resumeImportResponseSchema>;
export type ResumeImportWorkExperience = z.infer<typeof resumeImportWorkExperienceSchema>;
export type ResumeImportEducation = z.infer<typeof resumeImportEducationSchema>;
export type ResumeImportSkill = z.infer<typeof resumeImportSkillSchema>;
export type ResumeImportProject = z.infer<typeof resumeImportProjectSchema>;
export type ResumeImportCertification = z.infer<typeof resumeImportCertificationSchema>;
export type ResumeImportAchievement = z.infer<typeof resumeImportAchievementSchema>;
export type ResumeImportReference = z.infer<typeof resumeImportReferenceSchema>;
