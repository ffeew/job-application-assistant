import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  JobApplicationResumeRequest,
  IntelligentContentSelection,
} from "@/app/api/profile/validators";

export interface JobApplicationResumeResponse {
  html: string;
  aiSelection?: IntelligentContentSelection;
  application: {
    id: string;
    company: string;
    position: string;
  };
}

export interface SaveTailoredResumeRequest {
  title: string;
  content: string;
}

export interface SaveTailoredResumeResponse {
  success: boolean;
  resume: {
    id: string;
    title: string;
    isTailored: boolean;
    jobApplicationId: string;
    updatedAt: Date;
  };
  isNew: boolean;
}

// API calls for job application resume generation
const jobApplicationResumeApi = {
  generatePDF: async (
    applicationId: string,
    data: Omit<JobApplicationResumeRequest, "applicationId">
  ): Promise<Blob> => {
    const response = await fetch(
      `/api/applications/${applicationId}/resume?format=pdf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate PDF");
    }

    return response.blob();
  },

  generatePreview: async (
    applicationId: string,
    data: Omit<JobApplicationResumeRequest, "applicationId">
  ): Promise<JobApplicationResumeResponse> => {
    const response = await fetch(
      `/api/applications/${applicationId}/resume?format=preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate preview");
    }

    return response.json();
  },
};

// Hook to generate job application resume PDF - returns blob (caller handles download)
export function useGenerateJobApplicationPDF() {
  return useMutation({
    mutationFn: ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data: Omit<JobApplicationResumeRequest, "applicationId">;
    }) => jobApplicationResumeApi.generatePDF(applicationId, data),
  });
}

// Hook to generate job application resume preview
export function useGenerateJobApplicationPreview() {
  return useMutation({
    mutationFn: ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data: Omit<JobApplicationResumeRequest, "applicationId">;
    }) => jobApplicationResumeApi.generatePreview(applicationId, data),
  });
}

// API call to save tailored resume
const saveTailoredResume = async (
  applicationId: string,
  data: SaveTailoredResumeRequest
): Promise<SaveTailoredResumeResponse> => {
  const response = await fetch(`/api/applications/${applicationId}/resume`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to save tailored resume");
  }

  return response.json();
};

// Hook to save tailored resume for a job application
export function useSaveTailoredResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data: SaveTailoredResumeRequest;
    }) => saveTailoredResume(applicationId, data),
    onSuccess: (_, { applicationId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["job-application-resume", "info", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
