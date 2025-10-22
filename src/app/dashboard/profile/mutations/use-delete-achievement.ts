import { useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsKeys } from '../queries/use-achievements';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteAchievementApi = {
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/achievements/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete achievement');
    }
  },
};

// Hook to delete achievement
export function useDeleteAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAchievementApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: achievementsKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: achievementsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
