import { applicationJsonResponseSchema } from "@/app/api/applications/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationJsonResponse as JobApplication,
  UpdateApplicationRequest as UpdateJobApplicationData,
} from "@/lib/validators";
import { applicationsKeys } from "../queries/use-applications";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const updateApplicationApi = {
  update: async (
    id: string,
    data: UpdateJobApplicationData,
  ): Promise<JobApplication> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      applicationJsonResponseSchema,
      "Failed to update application",
    );
  },
};

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateJobApplicationData;
    }) => updateApplicationApi.update(id, data),
    onSuccess: (updatedApplication) => {
      queryClient.setQueryData(
        applicationsKeys.detail(updatedApplication.id),
        updatedApplication,
      );
      void queryClient.invalidateQueries({
        queryKey: applicationsKeys.lists(),
      });
      // Status changes affect the dashboard's active count and offer rate.
      void queryClient.invalidateQueries({
        queryKey: dashboardStatsKeys.stats(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
