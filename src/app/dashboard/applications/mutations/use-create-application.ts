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

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobApplicationData) => createApplicationApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
