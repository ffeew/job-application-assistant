import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CoverLetterResponse as CoverLetter,
  UpdateCoverLetterRequest as UpdateCoverLetterData
} from '@/lib/validators';
import { coverLettersKeys } from '../queries/use-cover-letters';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateCoverLetterApi = {
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
};

// Hook to update a cover letter
export function useUpdateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCoverLetterData }) =>
      updateCoverLetterApi.update(id, data),
    onSuccess: (updatedCoverLetter) => {
      // Update the specific cover letter in cache
      queryClient.setQueryData(coverLettersKeys.detail(updatedCoverLetter.id), updatedCoverLetter);
      // Invalidate cover letters list to refetch
      queryClient.invalidateQueries({ queryKey: coverLettersKeys.lists() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
