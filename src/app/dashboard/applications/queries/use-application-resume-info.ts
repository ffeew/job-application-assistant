import { applicationResumeInfoResponseSchema } from "@/app/api/applications/[id]/resume/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from "@tanstack/react-query";
import type { ApplicationResumeInfoResponse } from "@/app/api/applications/[id]/resume/validators";

const applicationResumeInfoApi = {
  get: async (
    applicationId: string,
  ): Promise<ApplicationResumeInfoResponse> => {
    const response = await fetch(`/api/applications/${applicationId}/resume`);
    return parseJsonResponse(
      response,
      applicationResumeInfoResponseSchema,
      "Failed to fetch application info",
    );
  },
};

export const applicationResumeInfoKeys = {
  all: ["job-application-resume"] as const,
  applicationInfo: (applicationId: string) =>
    [...applicationResumeInfoKeys.all, "info", applicationId] as const,
};

export function useApplicationResumeInfo(applicationId: string) {
  return useQuery({
    queryKey: applicationResumeInfoKeys.applicationInfo(applicationId),
    queryFn: () => applicationResumeInfoApi.get(applicationId),
    enabled: !!applicationId,
  });
}
