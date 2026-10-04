import { resumeJsonResponseSchema } from "@/app/api/resumes/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ResumeJsonResponse as Resume,
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
    return parseJsonResponse(response, resumeJsonResponseSchema, "Failed to create resume");
  },
};

// Hook to create a resume
export function useCreateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResumeData) => createResumeApi.create(data),
    onSuccess: () => {
      // Invalidate resume list to refetch
      void queryClient.invalidateQueries({ queryKey: resumesKeys.lists() });
      // Invalidate dashboard stats as resume count changed
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
