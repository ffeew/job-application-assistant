import { achievementJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateAchievementRequest,
  AchievementJsonResponse,
} from "@/app/api/profile/validators";
import { achievementsKeys } from "../queries/use-achievements";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const updateAchievementApi = {
  update: async (
    id: number,
    data: UpdateAchievementRequest,
  ): Promise<AchievementJsonResponse> => {
    const response = await fetch(`/api/profile/achievements/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      achievementJsonResponseSchema,
      "Failed to update achievement",
    );
  },
};

export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateAchievementRequest;
    }) => updateAchievementApi.update(id, data),
    onSuccess: (updatedAchievement) => {
      queryClient.setQueryData(
        achievementsKeys.detail(updatedAchievement.id),
        updatedAchievement,
      );
      void queryClient.invalidateQueries({ queryKey: achievementsKeys.all });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
