import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateAchievementRequest, AchievementResponse } from '@/lib/validators/profile.validator';
import { achievementsKeys } from '../queries/use-achievements';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createAchievementApi = {
  create: async (data: CreateAchievementRequest): Promise<AchievementResponse> => {
    const response = await fetch('/api/profile/achievements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create achievement');
    }
    return response.json();
  },
};

// Hook to create achievement
export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAchievementRequest) => createAchievementApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: achievementsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
