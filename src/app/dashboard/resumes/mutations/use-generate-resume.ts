"use client";

import { resumeValidationResponseSchema } from "@/app/api/resume-generation/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation } from "@tanstack/react-query";
import type { GenerateResumeRequest } from "@/app/api/profile/validators";
import { useGenerationJob } from "../queries/use-generation-job";
import type { ResumeValidationResponse } from "@/app/api/resume-generation/validators";

// Resume Generation API calls
const resumeGenerationApi = {
  validate: async (
    request: GenerateResumeRequest,
  ): Promise<ResumeValidationResponse> => {
    const response = await fetch("/api/resume-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return parseJsonResponse(
      response,
      resumeValidationResponseSchema,
      "Failed to validate resume",
    );
  },
};

// Hook to validate resume - returns validation result
export function useValidateResume() {
  return useMutation({
    mutationFn: resumeGenerationApi.validate,
  });
}

// Hook to generate resume preview
export function useGenerateResumePreview() {
  const job = useGenerationJob(null);
  return {
    ...job,
    mutateAsync: (
      request: GenerateResumeRequest,
      intent: "preview" | "download" = "preview",
    ) => job.mutateAsync({ kind: "profile", intent, request }),
  };
}
