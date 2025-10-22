import { useQuery } from '@tanstack/react-query';
import type { ReferenceResponse, ProfileQuery } from '@/app/api/profile/validators';

// Direct API call functions
const referencesApi = {
  getAll: async (query?: ProfileQuery): Promise<ReferenceResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/references?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch references');
    }
    return response.json();
  },

  getById: async (id: number): Promise<ReferenceResponse> => {
    const response = await fetch(`/api/profile/references/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reference');
    }
    return response.json();
  },
};

// Query keys for references
export const referencesKeys = {
  all: ['profile', 'references'] as const,
  lists: () => [...referencesKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...referencesKeys.lists(), query] as const,
  details: () => [...referencesKeys.all, 'detail'] as const,
  detail: (id: number) => [...referencesKeys.details(), id] as const,
};

// Hook to fetch all references
export function useReferences(query?: ProfileQuery) {
  return useQuery({
    queryKey: referencesKeys.list(query),
    queryFn: () => referencesApi.getAll(query),
  });
}

// Hook to fetch a single reference by ID
export function useReference(id: number) {
  return useQuery({
    queryKey: referencesKeys.detail(id),
    queryFn: () => referencesApi.getById(id),
    enabled: !!id,
  });
}
