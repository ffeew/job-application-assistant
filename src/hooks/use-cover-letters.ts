import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  coverLettersApi, 
  resumesApi,
  applicationsApi,
  type CoverLetter, 
  type GenerateCoverLetterData,
  type CreateCoverLetterData, 
  type UpdateCoverLetterData 
} from '@/lib/api';
import { dashboardKeys } from './use-dashboard';
import { resumeKeys } from './use-resumes';
import { applicationKeys } from './use-applications';

// Query keys for cover letters
export const coverLetterKeys = {
  all: ['cover-letters'] as const,
  lists: () => [...coverLetterKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...coverLetterKeys.lists(), { filters }] as const,
  details: () => [...coverLetterKeys.all, 'detail'] as const,
  detail: (id: string) => [...coverLetterKeys.details(), id] as const,
};

// Hook to fetch all cover letters
export function useCoverLetters() {
  return useQuery({
    queryKey: coverLetterKeys.lists(),
    queryFn: coverLettersApi.getAll,
  });
}

// Hook to fetch a single cover letter
export function useCoverLetter(id: string) {
  return useQuery({
    queryKey: coverLetterKeys.detail(id),
    queryFn: () => coverLettersApi.getById(id),
    enabled: !!id,
  });
}

// Hook to generate a cover letter with AI
export function useGenerateCoverLetter() {
  return useMutation({
    mutationFn: (data: GenerateCoverLetterData) => coverLettersApi.generate(data),
    // Note: This doesn't invalidate any queries as it just generates content
  });
}

// Hook to create a cover letter
export function useCreateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCoverLetterData) => coverLettersApi.create(data),
    onSuccess: () => {
      // Invalidate cover letters list to refetch
      queryClient.invalidateQueries({ queryKey: coverLetterKeys.lists() });
      // Invalidate dashboard stats as cover letter count changed
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook to update a cover letter
export function useUpdateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCoverLetterData }) => 
      coverLettersApi.update(id, data),
    onSuccess: (updatedCoverLetter) => {
      // Update the specific cover letter in cache
      queryClient.setQueryData(coverLetterKeys.detail(updatedCoverLetter.id), updatedCoverLetter);
      // Invalidate cover letters list to refetch
      queryClient.invalidateQueries({ queryKey: coverLetterKeys.lists() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook to delete a cover letter
export function useDeleteCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => coverLettersApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cover letters list cache
      queryClient.setQueryData<CoverLetter[]>(coverLetterKeys.lists(), (old) => 
        old ? old.filter(letter => letter.id !== deletedId) : []
      );
      // Remove specific cover letter from cache
      queryClient.removeQueries({ queryKey: coverLetterKeys.detail(deletedId) });
      // Invalidate dashboard stats as cover letter count changed
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Hook for cover letter generation page - fetches resumes and applications for dropdowns
export function useCoverLetterFormData() {
  const resumesQuery = useQuery({
    queryKey: resumeKeys.lists(),
    queryFn: resumesApi.getAll,
  });

  const applicationsQuery = useQuery({
    queryKey: applicationKeys.lists(),
    queryFn: applicationsApi.getAll,
  });

  return {
    resumes: resumesQuery.data || [],
    applications: applicationsQuery.data || [],
    isLoading: resumesQuery.isLoading || applicationsQuery.isLoading,
    isError: resumesQuery.isError || applicationsQuery.isError,
    error: resumesQuery.error || applicationsQuery.error,
  };
}