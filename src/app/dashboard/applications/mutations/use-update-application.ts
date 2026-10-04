import { applicationJsonResponseSchema } from "@/app/api/applications/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApplicationJsonResponse as JobApplication,
  UpdateApplicationRequest as UpdateJobApplicationData
} from '@/lib/validators';
import { applicationsKeys } from '../queries/use-applications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateApplicationApi = {
  update: async (id: string, data: UpdateJobApplicationData): Promise<JobApplication> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, applicationJsonResponseSchema, "Failed to update application");
  },
};

// Hook to update a job application
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobApplicationData }) =>
      updateApplicationApi.update(id, data),
    onSuccess: (updatedApplication) => {
      // Update the specific application in cache
      queryClient.setQueryData(applicationsKeys.detail(updatedApplication.id), updatedApplication);
      // Invalidate applications list to refetch (status might have changed affecting stats)
      void queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      // Invalidate dashboard stats as status change might affect active count and success rate
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
