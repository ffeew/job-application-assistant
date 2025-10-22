import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateEducationRequest, EducationResponse } from '@/app/api/profile/validators';
import { educationKeys } from '../queries/use-education';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createEducationApi = {
  create: async (data: CreateEducationRequest): Promise<EducationResponse> => {
    const response = await fetch('/api/profile/education', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create education');
    }
    return response.json();
  },
};

// Hook to create education
export function useCreateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEducationRequest) => createEducationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
