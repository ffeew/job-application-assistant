import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BulkUpdateOrderRequest } from '@/lib/validators/profile.validator';
import { referencesKeys } from '../queries/use-references';

// Direct API call function
const reorderReferencesApi = {
  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/references/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update references order');
    }
  },
};

// Hook to reorder references
export function useReorderReferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => reorderReferencesApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referencesKeys.all });
    },
  });
}
