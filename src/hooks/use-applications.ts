import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './use-dashboard';
import type { 
  ApplicationResponse as JobApplication, 
  CreateApplicationRequest as CreateJobApplicationData, 
  UpdateApplicationRequest as UpdateJobApplicationData 
} from '@/lib/validators';

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

  create: async (data: CreateJobApplicationData): Promise<JobApplication> => {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create application');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateJobApplicationData): Promise<JobApplication> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update application');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete application');
    }
  },
};

// Query keys for job applications
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...applicationKeys.lists(), { filters }] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
};

// Hook to fetch all job applications
export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.lists(),
    queryFn: applicationsApi.getAll,
  });
}

// Hook to fetch a single job application
export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.getById(id),
    enabled: !!id,
  });
}

// Hook to create a job application
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobApplicationData) => applicationsApi.create(data),
    onSuccess: () => {
      // Invalidate applications list to refetch
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      // Invalidate dashboard stats as application count changed
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook to update a job application
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobApplicationData }) => 
      applicationsApi.update(id, data),
    onSuccess: (updatedApplication) => {
      // Update the specific application in cache
      queryClient.setQueryData(applicationKeys.detail(updatedApplication.id), updatedApplication);
      // Invalidate applications list to refetch (status might have changed affecting stats)
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      // Invalidate dashboard stats as status change might affect active count and success rate
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook to delete a job application
export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from applications list cache
      queryClient.setQueryData<JobApplication[]>(applicationKeys.lists(), (old) => 
        old ? old.filter(app => app.id !== deletedId) : []
      );
      // Remove specific application from cache
      queryClient.removeQueries({ queryKey: applicationKeys.detail(deletedId) });
      // Invalidate dashboard stats as application count changed
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}