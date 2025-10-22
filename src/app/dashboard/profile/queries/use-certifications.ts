import { useQuery } from '@tanstack/react-query';
import type { CertificationResponse, ProfileQuery } from '@/app/api/profile/validators';

// Direct API call functions
const certificationsApi = {
  getAll: async (query?: ProfileQuery): Promise<CertificationResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/certifications?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch certifications');
    }
    return response.json();
  },

  getById: async (id: number): Promise<CertificationResponse> => {
    const response = await fetch(`/api/profile/certifications/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch certification');
    }
    return response.json();
  },
};

// Query keys for certifications
export const certificationsKeys = {
  all: ['profile', 'certifications'] as const,
  lists: () => [...certificationsKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...certificationsKeys.lists(), query] as const,
  details: () => [...certificationsKeys.all, 'detail'] as const,
  detail: (id: number) => [...certificationsKeys.details(), id] as const,
};

// Hook to fetch all certifications
export function useCertifications(query?: ProfileQuery) {
  return useQuery({
    queryKey: certificationsKeys.list(query),
    queryFn: () => certificationsApi.getAll(query),
  });
}

// Hook to fetch a single certification by ID
export function useCertification(id: number) {
  return useQuery({
    queryKey: certificationsKeys.detail(id),
    queryFn: () => certificationsApi.getById(id),
    enabled: !!id,
  });
}
