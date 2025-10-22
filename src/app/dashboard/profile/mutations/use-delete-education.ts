import { useMutation, useQueryClient } from '@tanstack/react-query';
import { educationKeys } from '../queries/use-education';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteEducationApi = {
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/education/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete education');
    }
  },
};

// Hook to delete education
export function useDeleteEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteEducationApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: educationKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: educationKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
