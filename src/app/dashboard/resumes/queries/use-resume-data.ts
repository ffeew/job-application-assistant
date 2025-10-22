"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  UserProfileResponse,
  WorkExperienceResponse,
  EducationResponse,
  SkillResponse,
  ProjectResponse,
  CertificationResponse,
  AchievementResponse,
} from "@/app/api/profile/validators";

interface ResumeData {
  profile: UserProfileResponse | null;
  workExperiences: WorkExperienceResponse[];
  education: EducationResponse[];
  skills: SkillResponse[];
  projects: ProjectResponse[];
  certifications: CertificationResponse[];
  achievements: AchievementResponse[];
}

// Resume Data API call
const resumeDataApi = {
  get: async (): Promise<ResumeData> => {
    const response = await fetch("/api/resume-generation");
    if (!response.ok) throw new Error("Failed to fetch resume data");
    return response.json();
  },
};

// Query Keys
export const resumeDataKeys = {
  all: ["resume-generation"] as const,
  data: () => [...resumeDataKeys.all, "data"] as const,
};

// Hook to fetch resume data
export function useResumeData() {
  return useQuery({
    queryKey: resumeDataKeys.data(),
    queryFn: resumeDataApi.get,
  });
}
