import { referenceJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { ReferenceJsonResponse, ProfileQuery } from '@/app/api/profile/validators';

const referencesApi = {
  getAll: async (query?: ProfileQuery): Promise<ReferenceJsonResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/references?${searchParams}`);
    return parseJsonResponse(response, referenceJsonResponseSchema.array(), "Failed to fetch references");
  },

  getById: async (id: number): Promise<ReferenceJsonResponse> => {
    const response = await fetch(`/api/profile/references/${id}`);
    return parseJsonResponse(response, referenceJsonResponseSchema, "Failed to fetch reference");
  },
};

export const referencesKeys = {
  all: ['profile', 'references'] as const,
  lists: () => [...referencesKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...referencesKeys.lists(), query] as const,
  details: () => [...referencesKeys.all, 'detail'] as const,
  detail: (id: number) => [...referencesKeys.details(), id] as const,
};

export function useReferences(query?: ProfileQuery) {
  return useQuery({
    queryKey: referencesKeys.list(query),
    queryFn: () => referencesApi.getAll(query),
  });
}

export function useReference(id: number) {
  return useQuery({
    queryKey: referencesKeys.detail(id),
    queryFn: () => referencesApi.getById(id),
    enabled: !!id,
  });
}
