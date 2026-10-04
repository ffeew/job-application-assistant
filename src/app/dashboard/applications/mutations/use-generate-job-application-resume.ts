import { parseJsonResponse } from "@/lib/api-response";
import {
  jobApplicationResumeResponseSchema,
  saveTailoredResumeResponseSchema,
} from "@/app/api/applications/[id]/resume/validators";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JobApplicationResumeRequest } from "@/app/api/profile/validators";
import type {
  JobApplicationResumeResponse,
  SaveTailoredResumeRequest,
  SaveTailoredResumeResponse,
} from "@/app/api/applications/[id]/resume/validators";
export type {
  JobApplicationResumeResponse,
  SaveTailoredResumeRequest,
  SaveTailoredResumeResponse,
} from "@/app/api/applications/[id]/resume/validators";

// API calls for job application resume generation
const jobApplicationResumeApi = {
  generatePreview: async (
    applicationId: string,
    data: Omit<JobApplicationResumeRequest, "applicationId">,
  ): Promise<JobApplicationResumeResponse> => {
    const response = await fetch(
      `/api/applications/${applicationId}/resume?format=preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    return parseJsonResponse(
      response,
      jobApplicationResumeResponseSchema,
      "Failed to generate preview",
    );
  },
};

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
  data: SaveTailoredResumeRequest,
): Promise<SaveTailoredResumeResponse> => {
  const response = await fetch(`/api/applications/${applicationId}/resume`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse(
    response,
    saveTailoredResumeResponseSchema,
    "Failed to save tailored resume",
  );
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
      void queryClient.invalidateQueries({
        queryKey: ["job-application-resume", "info", applicationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
