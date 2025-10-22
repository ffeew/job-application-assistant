import { useQuery } from '@tanstack/react-query';
import type { ProjectResponse, ProfileQuery } from '@/app/api/profile/validators';

// Direct API call functions
const projectsApi = {
  getAll: async (query?: ProfileQuery): Promise<ProjectResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/projects?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  },

  getById: async (id: number): Promise<ProjectResponse> => {
    const response = await fetch(`/api/profile/projects/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    return response.json();
  },
};

// Query keys for projects
export const projectsKeys = {
  all: ['profile', 'projects'] as const,
  lists: () => [...projectsKeys.all, 'list'] as const,
  list: (query?: ProfileQuery) => [...projectsKeys.lists(), query] as const,
  details: () => [...projectsKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectsKeys.details(), id] as const,
};

// Hook to fetch all projects
export function useProjects(query?: ProfileQuery) {
  return useQuery({
    queryKey: projectsKeys.list(query),
    queryFn: () => projectsApi.getAll(query),
  });
}

// Hook to fetch a single project by ID
export function useProject(id: number) {
  return useQuery({
    queryKey: projectsKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}
