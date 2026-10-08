import { achievementJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { AchievementJsonResponse, ProfileQuery } from '@/app/api/profile/validators';

const achievementsApi = {
  getAll: async (query?: ProfileQuery): Promise<AchievementJsonResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/achievements?${searchParams}`);
    return parseJsonResponse(response, achievementJsonResponseSchema.array(), "Failed to fetch achievements");
  },

  getById: async (id: number): Promise<AchievementJsonResponse> => {
    const response = await fetch(`/api/profile/achievements/${id}`);
    return parseJsonResponse(response, achievementJsonResponseSchema, "Failed to fetch achievement");
  },
};

export const achievementsKeys = {
  all: ['profile', 'achievements'] as const,
  lists: () => [...achievementsKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...achievementsKeys.lists(), query] as const,
  details: () => [...achievementsKeys.all, 'detail'] as const,
  detail: (id: number) => [...achievementsKeys.details(), id] as const,
};

export function useAchievements(query?: ProfileQuery) {
  return useQuery({
    queryKey: achievementsKeys.list(query),
    queryFn: () => achievementsApi.getAll(query),
  });
}

export function useAchievement(id: number) {
  return useQuery({
    queryKey: achievementsKeys.detail(id),
    queryFn: () => achievementsApi.getById(id),
    enabled: !!id,
  });
}
