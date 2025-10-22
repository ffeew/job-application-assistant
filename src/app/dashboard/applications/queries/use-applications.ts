import { useQuery } from '@tanstack/react-query';
import type { ApplicationResponse as JobApplication } from '@/lib/validators';

// Direct API call functions
const applicationsApi = {
  getAll: async (): Promise<JobApplication[]> => {
    const response = await fetch('/api/applications');
    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }
    return response.json();
  },

  getById: async (id: string): Promise<JobApplication> => {
    const response = await fetch(`/api/applications/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch application');
    }
    return response.json();
  },
};

// Query keys for applications
export const applicationsKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...applicationsKeys.lists(), { filters }] as const,
  details: () => [...applicationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationsKeys.details(), id] as const,
};

// Hook to fetch all job applications
export function useApplications() {
  return useQuery({
    queryKey: applicationsKeys.lists(),
    queryFn: applicationsApi.getAll,
  });
}

// Hook to fetch a single job application
export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationsKeys.detail(id),
    queryFn: () => applicationsApi.getById(id),
    enabled: !!id,
  });
}
