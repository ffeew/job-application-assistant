import { achievementJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateAchievementRequest, AchievementJsonResponse } from '@/app/api/profile/validators';
import { achievementsKeys } from '../queries/use-achievements';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createAchievementApi = {
  create: async (data: CreateAchievementRequest): Promise<AchievementJsonResponse> => {
    const response = await fetch('/api/profile/achievements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, achievementJsonResponseSchema, "Failed to create achievement");
  },
};

// Hook to create achievement
export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAchievementRequest) => createAchievementApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: achievementsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
