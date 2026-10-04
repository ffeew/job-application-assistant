import { coverLetterJsonResponseSchema } from "@/app/api/cover-letters/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CoverLetterJsonResponse as CoverLetter,
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
    return parseJsonResponse(response, coverLetterJsonResponseSchema, "Failed to create cover letter");
  },
};

// Hook to create a cover letter
export function useCreateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCoverLetterData) => createCoverLetterApi.create(data),
    onSuccess: () => {
      // Invalidate cover letters list to refetch
      void queryClient.invalidateQueries({ queryKey: coverLettersKeys.lists() });
      // Invalidate dashboard stats as cover letter count changed
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
