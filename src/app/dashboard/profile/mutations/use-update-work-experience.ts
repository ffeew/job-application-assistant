import { workExperienceJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateWorkExperienceRequest,
  WorkExperienceJsonResponse,
} from "@/app/api/profile/validators";
import { workExperiencesKeys } from "../queries/use-work-experiences";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const updateWorkExperienceApi = {
  update: async (
    id: number,
    data: UpdateWorkExperienceRequest,
  ): Promise<WorkExperienceJsonResponse> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      workExperienceJsonResponseSchema,
      "Failed to update work experience",
    );
  },
};

export function useUpdateWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateWorkExperienceRequest;
    }) => updateWorkExperienceApi.update(id, data),
    onSuccess: (updatedExperience) => {
      queryClient.setQueryData(
        workExperiencesKeys.detail(updatedExperience.id),
        updatedExperience,
      );
      void queryClient.invalidateQueries({ queryKey: workExperiencesKeys.all });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
