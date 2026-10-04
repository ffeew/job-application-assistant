"use client";

import { resumeValidationResponseSchema } from "@/app/api/resume-generation/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation } from "@tanstack/react-query";
import type { GenerateResumeRequest } from "@/app/api/profile/validators";
import {
  generatedResumeResultSchema,
  type GeneratedResumeResult,
} from "@/lib/resume-document";
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

  generatePreview: async (
    request: GenerateResumeRequest,
  ): Promise<GeneratedResumeResult> => {
    const response = await fetch("/api/resume-generation/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return parseJsonResponse(
      response,
      generatedResumeResultSchema,
      "Failed to generate resume preview",
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
  return useMutation({
    mutationFn: resumeGenerationApi.generatePreview,
  });
}
