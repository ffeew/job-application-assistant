import { workExperienceJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { WorkExperienceJsonResponse, ProfileQuery } from '@/app/api/profile/validators';

const workExperiencesApi = {
  getAll: async (query?: ProfileQuery): Promise<WorkExperienceJsonResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/work-experiences?${searchParams}`);
    return parseJsonResponse(response, workExperienceJsonResponseSchema.array(), "Failed to fetch work experiences");
  },

  getById: async (id: number): Promise<WorkExperienceJsonResponse> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`);
    return parseJsonResponse(response, workExperienceJsonResponseSchema, "Failed to fetch work experience");
  },
};

export const workExperiencesKeys = {
  all: ['profile', 'work-experiences'] as const,
  lists: () => [...workExperiencesKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...workExperiencesKeys.lists(), query] as const,
  details: () => [...workExperiencesKeys.all, 'detail'] as const,
  detail: (id: number) => [...workExperiencesKeys.details(), id] as const,
};

export function useWorkExperiences(query?: ProfileQuery) {
  return useQuery({
    queryKey: workExperiencesKeys.list(query),
    queryFn: () => workExperiencesApi.getAll(query),
  });
}

export function useWorkExperience(id: number) {
  return useQuery({
    queryKey: workExperiencesKeys.detail(id),
    queryFn: () => workExperiencesApi.getById(id),
    enabled: !!id,
  });
}
