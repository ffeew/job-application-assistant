import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateAchievementRequest, AchievementResponse } from '@/app/api/profile/validators';
import { achievementsKeys } from '../queries/use-achievements';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateAchievementApi = {
  update: async (id: number, data: UpdateAchievementRequest): Promise<AchievementResponse> => {
    const response = await fetch(`/api/profile/achievements/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update achievement');
    }
    return response.json();
  },
};

// Hook to update achievement
export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAchievementRequest }) =>
      updateAchievementApi.update(id, data),
    onSuccess: (updatedAchievement) => {
      queryClient.setQueryData(achievementsKeys.detail(updatedAchievement.id), updatedAchievement);
      queryClient.invalidateQueries({ queryKey: achievementsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
