import { skillJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { SkillJsonResponse, ProfileQuery } from '@/app/api/profile/validators';

const skillsApi = {
  getAll: async (query?: ProfileQuery): Promise<SkillJsonResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.category) searchParams.set('category', query.category);
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/skills?${searchParams}`);
    return parseJsonResponse(response, skillJsonResponseSchema.array(), "Failed to fetch skills");
  },

  getById: async (id: number): Promise<SkillJsonResponse> => {
    const response = await fetch(`/api/profile/skills/${id}`);
    return parseJsonResponse(response, skillJsonResponseSchema, "Failed to fetch skill");
  },
};

export const skillsKeys = {
  all: ['profile', 'skills'] as const,
  lists: () => [...skillsKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...skillsKeys.lists(), query] as const,
  details: () => [...skillsKeys.all, 'detail'] as const,
  detail: (id: number) => [...skillsKeys.details(), id] as const,
};

export function useSkills(query?: ProfileQuery) {
  return useQuery({
    queryKey: skillsKeys.list(query),
    queryFn: () => skillsApi.getAll(query),
  });
}

export function useSkill(id: number) {
  return useQuery({
    queryKey: skillsKeys.detail(id),
    queryFn: () => skillsApi.getById(id),
    enabled: !!id,
  });
}
