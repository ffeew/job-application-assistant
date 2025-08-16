import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resumesApi, type Resume, type CreateResumeData, type UpdateResumeData } from '@/lib/api';
import { dashboardKeys } from './use-dashboard';

// Query keys for resumes
export const resumeKeys = {
  all: ['resumes'] as const,
  lists: () => [...resumeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...resumeKeys.lists(), { filters }] as const,
  details: () => [...resumeKeys.all, 'detail'] as const,
  detail: (id: string) => [...resumeKeys.details(), id] as const,
};

// Hook to fetch all resumes
export function useResumes() {
  return useQuery({
    queryKey: resumeKeys.lists(),
    queryFn: resumesApi.getAll,
  });
}

// Hook to fetch a single resume
export function useResume(id: string) {
  return useQuery({
    queryKey: resumeKeys.detail(id),
    queryFn: () => resumesApi.getById(id),
    enabled: !!id,
  });
}

// Hook to create a resume
export function useCreateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResumeData) => resumesApi.create(data),
    onSuccess: () => {
      // Invalidate resume list to refetch
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      // Invalidate dashboard stats as resume count changed
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook to update a resume
export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResumeData }) => 
      resumesApi.update(id, data),
    onSuccess: (updatedResume) => {
      // Update the specific resume in cache
      queryClient.setQueryData(resumeKeys.detail(updatedResume.id), updatedResume);
      // Invalidate resume list to refetch (for default status changes)
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook to delete a resume
export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resumesApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from resume list cache
      queryClient.setQueryData<Resume[]>(resumeKeys.lists(), (old) => 
        old ? old.filter(resume => resume.id !== deletedId) : []
      );
      // Remove specific resume from cache
      queryClient.removeQueries({ queryKey: resumeKeys.detail(deletedId) });
      // Invalidate dashboard stats as resume count changed
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}