import { useQuery } from '@tanstack/react-query';
import type { SkillResponse, ProfileQuery } from '@/lib/validators/profile.validator';

// Direct API call functions
const skillsApi = {
  getAll: async (query?: ProfileQuery): Promise<SkillResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.category) searchParams.set('category', query.category);
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/skills?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skills');
    }
    return response.json();
  },

  getById: async (id: number): Promise<SkillResponse> => {
    const response = await fetch(`/api/profile/skills/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skill');
    }
    return response.json();
  },
};

// Query keys for skills
export const skillsKeys = {
  all: ['profile', 'skills'] as const,
  lists: () => [...skillsKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...skillsKeys.lists(), query] as const,
  details: () => [...skillsKeys.all, 'detail'] as const,
  detail: (id: number) => [...skillsKeys.details(), id] as const,
};

// Hook to fetch all skills
export function useSkills(query?: ProfileQuery) {
  return useQuery({
    queryKey: skillsKeys.list(query),
    queryFn: () => skillsApi.getAll(query),
  });
}

// Hook to fetch a single skill by ID
export function useSkill(id: number) {
  return useQuery({
    queryKey: skillsKeys.detail(id),
    queryFn: () => skillsApi.getById(id),
    enabled: !!id,
  });
}
