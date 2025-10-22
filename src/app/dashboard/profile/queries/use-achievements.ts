import { useQuery } from '@tanstack/react-query';
import type { AchievementResponse, ProfileQuery } from '@/app/api/profile/validators';

// Direct API call functions
const achievementsApi = {
  getAll: async (query?: ProfileQuery): Promise<AchievementResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/achievements?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch achievements');
    }
    return response.json();
  },

  getById: async (id: number): Promise<AchievementResponse> => {
    const response = await fetch(`/api/profile/achievements/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch achievement');
    }
    return response.json();
  },
};

// Query keys for achievements
export const achievementsKeys = {
  all: ['profile', 'achievements'] as const,
  lists: () => [...achievementsKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...achievementsKeys.lists(), query] as const,
  details: () => [...achievementsKeys.all, 'detail'] as const,
  detail: (id: number) => [...achievementsKeys.details(), id] as const,
};

// Hook to fetch all achievements
export function useAchievements(query?: ProfileQuery) {
  return useQuery({
    queryKey: achievementsKeys.list(query),
    queryFn: () => achievementsApi.getAll(query),
  });
}

// Hook to fetch a single achievement by ID
export function useAchievement(id: number) {
  return useQuery({
    queryKey: achievementsKeys.detail(id),
    queryFn: () => achievementsApi.getById(id),
    enabled: !!id,
  });
}
