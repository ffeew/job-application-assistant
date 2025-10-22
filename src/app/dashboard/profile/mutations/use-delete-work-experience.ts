import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workExperiencesKeys } from '../queries/use-work-experiences';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteWorkExperienceApi = {
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete work experience');
    }
  },
};

// Hook to delete work experience
export function useDeleteWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteWorkExperienceApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: workExperiencesKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: workExperiencesKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
