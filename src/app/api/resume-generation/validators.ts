import { z } from "zod";
import {
  achievementJsonResponseSchema,
  certificationJsonResponseSchema,
  educationJsonResponseSchema,
  projectJsonResponseSchema,
  skillJsonResponseSchema,
  userProfileJsonResponseSchema,
  workExperienceJsonResponseSchema,
} from "@/app/api/profile/validators";

export const resumeDataJsonResponseSchema = z.object({
  profile: userProfileJsonResponseSchema.nullable(),
  workExperiences: z.array(workExperienceJsonResponseSchema),
  education: z.array(educationJsonResponseSchema),
  skills: z.array(skillJsonResponseSchema),
  projects: z.array(projectJsonResponseSchema),
  certifications: z.array(certificationJsonResponseSchema),
  achievements: z.array(achievementJsonResponseSchema),
});

export const resumeValidationResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
});

export type ResumeDataJsonResponse = z.infer<
  typeof resumeDataJsonResponseSchema
>;
export type ResumeValidationResponse = z.infer<
  typeof resumeValidationResponseSchema
>;
