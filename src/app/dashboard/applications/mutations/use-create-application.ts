import { applicationJsonResponseSchema } from "@/app/api/applications/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApplicationJsonResponse as JobApplication,
  CreateApplicationRequest as CreateJobApplicationData
} from '@/lib/validators';
import { applicationsKeys } from '../queries/use-applications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createApplicationApi = {
  create: async (data: CreateJobApplicationData): Promise<JobApplication> => {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, applicationJsonResponseSchema, "Failed to create application");
  },
};

// Hook to create a job application
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobApplicationData) => createApplicationApi.create(data),
    onSuccess: () => {
      // Invalidate applications list to refetch
      void queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      // Invalidate dashboard stats as application count changed
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
