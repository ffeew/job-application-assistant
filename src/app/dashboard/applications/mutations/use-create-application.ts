import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApplicationResponse as JobApplication,
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
    if (!response.ok) {
      throw new Error('Failed to create application');
    }
    return response.json();
  },
};

// Hook to create a job application
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobApplicationData) => createApplicationApi.create(data),
    onSuccess: () => {
      // Invalidate applications list to refetch
      queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      // Invalidate dashboard stats as application count changed
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
