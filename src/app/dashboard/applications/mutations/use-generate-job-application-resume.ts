import { useGenerationJob } from "@/app/dashboard/resumes/queries/use-generation-job";
import { parseJsonResponse } from "@/lib/api-response";
import { saveTailoredResumeResponseSchema } from "@/app/api/applications/[id]/resume/validators";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JobApplicationResumeRequest } from "@/app/api/profile/validators";
import type {
  SaveTailoredResumeRequest,
  SaveTailoredResumeResponse,
} from "@/app/api/applications/[id]/resume/validators";
export type {
  JobApplicationResumeResponse,
  SaveTailoredResumeRequest,
  SaveTailoredResumeResponse,
} from "@/app/api/applications/[id]/resume/validators";

export function useGenerateJobApplicationPreview(
  applicationId: string | undefined,
) {
  const job = useGenerationJob(applicationId);
  return {
    ...job,
    mutateAsync: ({
      applicationId: id,
      data,
      intent = "preview",
    }: {
      applicationId: string;
      data: Omit<JobApplicationResumeRequest, "applicationId">;
      intent?: "preview" | "download" | "save-and-download";
    }) =>
      job.mutateAsync({
        kind: "application",
        intent,
        request: { ...data, applicationId: id },
      }),
  };
}

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
      void queryClient.invalidateQueries({
        queryKey: ["job-application-resume", "info", applicationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
