import { educationJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateEducationRequest,
  EducationJsonResponse,
} from "@/app/api/profile/validators";
import { educationKeys } from "../queries/use-education";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const createEducationApi = {
  create: async (
    data: CreateEducationRequest,
  ): Promise<EducationJsonResponse> => {
    const response = await fetch("/api/profile/education", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      educationJsonResponseSchema,
      "Failed to create education",
    );
  },
};

export function useCreateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEducationRequest) =>
      createEducationApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: educationKeys.all });
      void queryClient.invalidateQueries({
        queryKey: dashboardStatsKeys.stats(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
