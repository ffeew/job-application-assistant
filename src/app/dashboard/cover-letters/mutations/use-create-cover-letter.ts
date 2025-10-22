import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CoverLetterResponse as CoverLetter,
  CreateCoverLetterRequest as CreateCoverLetterData
} from '@/lib/validators';
import { coverLettersKeys } from '../queries/use-cover-letters';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createCoverLetterApi = {
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
};

// Hook to create a cover letter
export function useCreateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCoverLetterData) => createCoverLetterApi.create(data),
    onSuccess: () => {
      // Invalidate cover letters list to refetch
      queryClient.invalidateQueries({ queryKey: coverLettersKeys.lists() });
      // Invalidate dashboard stats as cover letter count changed
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
