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
    if (!response.ok) throw new Error("Failed to generate PDF");
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

// Hook to validate resume
export function useValidateResume() {
  return useMutation({
    mutationFn: resumeGenerationApi.validate,
  });
}

// Hook to generate resume PDF
export function useGenerateResumePDF() {
  return useMutation({
    mutationFn: async (request: GenerateResumeRequest) => {
      const blob = await resumeGenerationApi.generatePDF(request);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${request.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return blob;
    },
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

// Combined hook for resume generation workflow
export function useResumeGeneration() {
  const validateMutation = useValidateResume();
  const generatePDFMutation = useGenerateResumePDF();
  const generateHTMLMutation = useGenerateResumeHTML();
  const generatePreviewMutation = useGenerateResumePreview();

  const generateResume = async (request: GenerateResumeRequest, format: "pdf" | "html" = "pdf") => {
    // First validate the resume
    const validation = await validateMutation.mutateAsync(request);

    if (!validation.valid) {
      throw new Error(`Resume validation failed: ${validation.errors.join(", ")}`);
    }

    // Generate in requested format
    if (format === "pdf") {
      return generatePDFMutation.mutateAsync(request);
    } else {
      return generateHTMLMutation.mutateAsync(request);
    }
  };

  const generatePreview = async (request: GenerateResumeRequest) => {
    return generatePreviewMutation.mutateAsync(request);
  };

  return {
    generateResume,
    generatePreview,
    isValidating: validateMutation.isPending,
    isGenerating: generatePDFMutation.isPending || generateHTMLMutation.isPending,
    isGeneratingPreview: generatePreviewMutation.isPending,
    validationError: validateMutation.error,
    generationError: generatePDFMutation.error || generateHTMLMutation.error,
    previewError: generatePreviewMutation.error,
  };
}
