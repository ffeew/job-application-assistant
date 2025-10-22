import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateReferenceRequest, ReferenceResponse } from '@/app/api/profile/validators';
import { referencesKeys } from '../queries/use-references';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createReferenceApi = {
  create: async (data: CreateReferenceRequest): Promise<ReferenceResponse> => {
    const response = await fetch('/api/profile/references', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create reference');
    }
    return response.json();
  },
};

// Hook to create reference
export function useCreateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReferenceRequest) => createReferenceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referencesKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
