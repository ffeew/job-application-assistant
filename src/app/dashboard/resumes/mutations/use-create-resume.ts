import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ResumeResponse as Resume,
  CreateResumeRequest as CreateResumeData
} from '@/lib/validators';
import { resumesKeys } from '../queries/use-resumes';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createResumeApi = {
  create: async (data: CreateResumeData): Promise<Resume> => {
    const response = await fetch('/api/resumes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create resume');
    }
    return response.json();
  },
};

// Hook to create a resume
export function useCreateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResumeData) => createResumeApi.create(data),
    onSuccess: () => {
      // Invalidate resume list to refetch
      queryClient.invalidateQueries({ queryKey: resumesKeys.lists() });
      // Invalidate dashboard stats as resume count changed
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
