import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BulkUpdateOrderRequest } from '@/lib/validators/profile.validator';
import { certificationsKeys } from '../queries/use-certifications';

// Direct API call function
const reorderCertificationsApi = {
  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/certifications/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update certifications order');
    }
  },
};

// Hook to reorder certifications
export function useReorderCertifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => reorderCertificationsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
    },
  });
}
