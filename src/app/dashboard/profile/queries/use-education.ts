import { useQuery } from '@tanstack/react-query';
import type { EducationResponse, ProfileQuery } from '@/lib/validators/profile.validator';

// Direct API call functions
const educationApi = {
  getAll: async (query?: ProfileQuery): Promise<EducationResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/education?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch education');
    }
    return response.json();
  },

  getById: async (id: number): Promise<EducationResponse> => {
    const response = await fetch(`/api/profile/education/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch education');
    }
    return response.json();
  },
};

// Query keys for education
export const educationKeys = {
  all: ['profile', 'education'] as const,
  lists: () => [...educationKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...educationKeys.lists(), query] as const,
  details: () => [...educationKeys.all, 'detail'] as const,
  detail: (id: number) => [...educationKeys.details(), id] as const,
};

// Hook to fetch all education entries
export function useEducation(query?: ProfileQuery) {
  return useQuery({
    queryKey: educationKeys.list(query),
    queryFn: () => educationApi.getAll(query),
  });
}

// Hook to fetch a single education entry by ID
export function useEducationById(id: number) {
  return useQuery({
    queryKey: educationKeys.detail(id),
    queryFn: () => educationApi.getById(id),
    enabled: !!id,
  });
}
