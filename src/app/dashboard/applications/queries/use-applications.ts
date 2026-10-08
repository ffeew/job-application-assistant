import { applicationJsonResponseSchema } from "@/app/api/applications/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { ApplicationJsonResponse as JobApplication } from '@/lib/validators';

const applicationsApi = {
  getAll: async (): Promise<JobApplication[]> => {
    const response = await fetch('/api/applications');
    return parseJsonResponse(response, applicationJsonResponseSchema.array(), "Failed to fetch applications");
  },

  getById: async (id: string): Promise<JobApplication> => {
    const response = await fetch(`/api/applications/${id}`);
    return parseJsonResponse(response, applicationJsonResponseSchema, "Failed to fetch application");
  },
};

export const applicationsKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...applicationsKeys.lists(), { filters }] as const,
  details: () => [...applicationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationsKeys.details(), id] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationsKeys.lists(),
    queryFn: applicationsApi.getAll,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationsKeys.detail(id),
    queryFn: () => applicationsApi.getById(id),
    enabled: !!id,
  });
}
