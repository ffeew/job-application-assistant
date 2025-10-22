import { useQuery } from '@tanstack/react-query';
import type { WorkExperienceResponse, ProfileQuery } from '@/app/api/profile/validators';

// Direct API call functions
const workExperiencesApi = {
  getAll: async (query?: ProfileQuery): Promise<WorkExperienceResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/work-experiences?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch work experiences');
    }
    return response.json();
  },

  getById: async (id: number): Promise<WorkExperienceResponse> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch work experience');
    }
    return response.json();
  },
};

// Query keys for work experiences
export const workExperiencesKeys = {
  all: ['profile', 'work-experiences'] as const,
  lists: () => [...workExperiencesKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...workExperiencesKeys.lists(), query] as const,
  details: () => [...workExperiencesKeys.all, 'detail'] as const,
  detail: (id: number) => [...workExperiencesKeys.details(), id] as const,
};

// Hook to fetch all work experiences
export function useWorkExperiences(query?: ProfileQuery) {
  return useQuery({
    queryKey: workExperiencesKeys.list(query),
    queryFn: () => workExperiencesApi.getAll(query),
  });
}

// Hook to fetch a single work experience by ID
export function useWorkExperience(id: number) {
  return useQuery({
    queryKey: workExperiencesKeys.detail(id),
    queryFn: () => workExperiencesApi.getById(id),
    enabled: !!id,
  });
}
