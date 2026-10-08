import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BulkUpdateOrderRequest } from '@/app/api/profile/validators';
import { certificationsKeys } from '../queries/use-certifications';

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

export function useReorderCertifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => reorderCertificationsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
    },
  });
}
