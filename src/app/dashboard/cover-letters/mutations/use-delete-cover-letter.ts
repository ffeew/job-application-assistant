import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoverLetterResponse as CoverLetter } from '@/lib/validators';
import { coverLettersKeys } from '../queries/use-cover-letters';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteCoverLetterApi = {
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/cover-letters/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete cover letter');
    }
  },
};

// Hook to delete a cover letter
export function useDeleteCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCoverLetterApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cover letters list cache
      queryClient.setQueryData<CoverLetter[]>(coverLettersKeys.lists(), (old) =>
        old ? old.filter(letter => letter.id !== deletedId) : []
      );
      // Remove specific cover letter from cache
      queryClient.removeQueries({ queryKey: coverLettersKeys.detail(deletedId) });
      // Invalidate dashboard stats as cover letter count changed
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
