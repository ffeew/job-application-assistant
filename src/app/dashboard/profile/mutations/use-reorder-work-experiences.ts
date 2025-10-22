import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BulkUpdateOrderRequest } from '@/app/api/profile/validators';
import { workExperiencesKeys } from '../queries/use-work-experiences';

// Direct API call function
const reorderWorkExperiencesApi = {
  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/work-experiences/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update work experience order');
    }
  },
};

// Hook to reorder work experiences
export function useReorderWorkExperiences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => reorderWorkExperiencesApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workExperiencesKeys.all });
    },
  });
}
