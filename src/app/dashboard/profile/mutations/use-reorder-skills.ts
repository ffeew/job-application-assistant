import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BulkUpdateOrderRequest } from '@/lib/validators/profile.validator';
import { skillsKeys } from '../queries/use-skills';

// Direct API call function
const reorderSkillsApi = {
  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/skills/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update skills order');
    }
  },
};

// Hook to reorder skills
export function useReorderSkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => reorderSkillsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsKeys.all });
    },
  });
}
