"use client";

import { resumeValidationResponseSchema } from "@/app/api/resume-generation/validators";
import { parseJsonResponse, readApiError } from "@/lib/api-response";
import { useMutation } from "@tanstack/react-query";
import type { GenerateResumeRequest } from "@/app/api/profile/validators";
import type { ResumeValidationResponse } from "@/app/api/resume-generation/validators";

// Resume Generation API calls
const resumeGenerationApi = {
  validate: async (request: GenerateResumeRequest): Promise<ResumeValidationResponse> => {
    const response = await fetch("/api/resume-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return parseJsonResponse(response, resumeValidationResponseSchema, "Failed to validate resume");
  },

  generatePDF: async (request: GenerateResumeRequest): Promise<Blob> => {
    const response = await fetch("/api/resume-generation/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw await readApiError(response, "Failed to generate PDF");
    }
    return response.blob();
  },

  generateHTML: async (request: GenerateResumeRequest): Promise<string> => {
    const response = await fetch("/api/resume-generation/html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to generate HTML");
    return response.text();
  },

  generatePreview: async (request: GenerateResumeRequest): Promise<string> => {
    const response = await fetch("/api/resume-generation/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to generate preview");
    return response.text();
  },
};

// Hook to validate resume - returns validation result
export function useValidateResume() {
  return useMutation({
    mutationFn: resumeGenerationApi.validate,
  });
}

// Hook to generate resume PDF - returns blob (caller handles download)
export function useGenerateResumePDF() {
  return useMutation({
    mutationFn: resumeGenerationApi.generatePDF,
  });
}

// Hook to generate resume HTML
export function useGenerateResumeHTML() {
  return useMutation({
    mutationFn: resumeGenerationApi.generateHTML,
  });
}

// Hook to generate resume preview
export function useGenerateResumePreview() {
  return useMutation({
    mutationFn: resumeGenerationApi.generatePreview,
  });
}
