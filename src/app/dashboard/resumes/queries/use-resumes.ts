import { useQuery } from '@tanstack/react-query';
import type { ResumeResponse as Resume } from '@/app/api/resumes/validators';

// Direct API call functions
const resumesApi = {
  getAll: async (): Promise<Resume[]> => {
    const response = await fetch('/api/resumes');
    if (!response.ok) {
      throw new Error('Failed to fetch resumes');
    }
    return response.json();
  },

  getById: async (id: string): Promise<Resume> => {
    const response = await fetch(`/api/resumes/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch resume');
    }
    return response.json();
  },
};

// Query keys for resumes
export const resumesKeys = {
  all: ['resumes'] as const,
  lists: () => [...resumesKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...resumesKeys.lists(), { filters }] as const,
  details: () => [...resumesKeys.all, 'detail'] as const,
  detail: (id: string) => [...resumesKeys.details(), id] as const,
};

// Hook to fetch all resumes
export function useResumes() {
  return useQuery({
    queryKey: resumesKeys.lists(),
    queryFn: resumesApi.getAll,
  });
}

// Hook to fetch a single resume
export function useResume(id: string) {
  return useQuery({
    queryKey: resumesKeys.detail(id),
    queryFn: () => resumesApi.getById(id),
    enabled: !!id,
  });
}
