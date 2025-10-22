import { useMutation, useQueryClient } from '@tanstack/react-query';
import { referencesKeys } from '../queries/use-references';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteReferenceApi = {
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/references/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete reference');
    }
  },
};

// Hook to delete reference
export function useDeleteReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteReferenceApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: referencesKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: referencesKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
