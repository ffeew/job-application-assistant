import { useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsKeys } from '../queries/use-skills';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteSkillApi = {
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/skills/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete skill');
    }
  },
};

// Hook to delete skill
export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSkillApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: skillsKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
