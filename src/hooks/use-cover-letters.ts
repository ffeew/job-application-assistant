import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './use-dashboard';
import { useResumes } from './use-resumes';
import { useApplications } from './use-applications';
import type { 
  CoverLetterResponse as CoverLetter, 
  GenerateCoverLetterRequest as GenerateCoverLetterData,
  GenerateCoverLetterResponse,
  CreateCoverLetterRequest as CreateCoverLetterData, 
  UpdateCoverLetterRequest as UpdateCoverLetterData 
} from '@/lib/validators';

// Direct API call functions
const coverLettersApi = {
  getAll: async (): Promise<CoverLetter[]> => {
    const response = await fetch('/api/cover-letters');
    if (!response.ok) {
      throw new Error('Failed to fetch cover letters');
    }
    return response.json();
  },

  getById: async (id: string): Promise<CoverLetter> => {
    const response = await fetch(`/api/cover-letters/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cover letter');
    }
    return response.json();
  },

  create: async (data: CreateCoverLetterData): Promise<CoverLetter> => {
    const response = await fetch('/api/cover-letters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create cover letter');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateCoverLetterData): Promise<CoverLetter> => {
    const response = await fetch(`/api/cover-letters/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update cover letter');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/cover-letters/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete cover letter');
    }
  },

  generate: async (data: GenerateCoverLetterData): Promise<GenerateCoverLetterResponse> => {
    const response = await fetch('/api/cover-letters/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate cover letter');
    }
    return response.json();
  },
};

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
  const resumesQuery = useResumes();
  const applicationsQuery = useApplications();

  return {
    resumes: resumesQuery.data || [],
    applications: applicationsQuery.data || [],
    isLoading: resumesQuery.isLoading || applicationsQuery.isLoading,
    isError: resumesQuery.isError || applicationsQuery.isError,
    error: resumesQuery.error || applicationsQuery.error,
  };
}