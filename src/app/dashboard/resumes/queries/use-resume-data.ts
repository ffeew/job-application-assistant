"use client";

import { resumeDataJsonResponseSchema } from "@/app/api/resume-generation/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from "@tanstack/react-query";
import type { ResumeDataJsonResponse } from "@/app/api/resume-generation/validators";

const resumeDataApi = {
  get: async (): Promise<ResumeDataJsonResponse> => {
    const response = await fetch("/api/resume-generation");
    return parseJsonResponse(
      response,
      resumeDataJsonResponseSchema,
      "Failed to fetch resume data",
    );
  },
};

export const resumeDataKeys = {
  all: ["resume-generation"] as const,
  data: () => [...resumeDataKeys.all, "data"] as const,
};

export function useResumeData() {
  return useQuery({
    queryKey: resumeDataKeys.data(),
    queryFn: resumeDataApi.get,
  });
}
