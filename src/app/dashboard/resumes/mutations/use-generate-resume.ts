"use client";

import { useMutation } from "@tanstack/react-query";
import type { GenerateResumeRequest } from "@/app/api/profile/validators";

interface ResumeValidationResult {
  valid: boolean;
  errors: string[];
}

// Resume Generation API calls
const resumeGenerationApi = {
  validate: async (request: GenerateResumeRequest): Promise<ResumeValidationResult> => {
    const response = await fetch("/api/resume-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to validate resume");
    return response.json();
  },

  generatePDF: async (request: GenerateResumeRequest): Promise<Blob> => {
    const response = await fetch("/api/resume-generation/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate PDF");
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
