import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateWorkExperienceRequest, WorkExperienceResponse } from '@/app/api/profile/validators';
import { workExperiencesKeys } from '../queries/use-work-experiences';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createWorkExperienceApi = {
  create: async (data: CreateWorkExperienceRequest): Promise<WorkExperienceResponse> => {
    const response = await fetch('/api/profile/work-experiences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create work experience');
    }
    return response.json();
  },
};

// Hook to create work experience
export function useCreateWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkExperienceRequest) => createWorkExperienceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workExperiencesKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
