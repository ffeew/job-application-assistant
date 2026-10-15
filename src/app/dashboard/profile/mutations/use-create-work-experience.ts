import { workExperienceJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkExperienceRequest,
  WorkExperienceJsonResponse,
} from "@/app/api/profile/validators";
import { workExperiencesKeys } from "../queries/use-work-experiences";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const createWorkExperienceApi = {
  create: async (
    data: CreateWorkExperienceRequest,
  ): Promise<WorkExperienceJsonResponse> => {
    const response = await fetch("/api/profile/work-experiences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      workExperienceJsonResponseSchema,
      "Failed to create work experience",
    );
  },
};

export function useCreateWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkExperienceRequest) =>
      createWorkExperienceApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workExperiencesKeys.all });
      void queryClient.invalidateQueries({
        queryKey: dashboardStatsKeys.stats(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
