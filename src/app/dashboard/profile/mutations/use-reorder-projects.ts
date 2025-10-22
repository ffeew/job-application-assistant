import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BulkUpdateOrderRequest } from '@/lib/validators/profile.validator';
import { projectsKeys } from '../queries/use-projects';

// Direct API call function
const reorderProjectsApi = {
  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/projects/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update projects order');
    }
  },
};

// Hook to reorder projects
export function useReorderProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => reorderProjectsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}
