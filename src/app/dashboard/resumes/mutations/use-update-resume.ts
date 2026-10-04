import { resumeJsonResponseSchema } from "@/app/api/resumes/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ResumeJsonResponse as Resume,
  UpdateResumeRequest as UpdateResumeData
} from '@/lib/validators';
import { resumesKeys } from '../queries/use-resumes';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateResumeApi = {
  update: async (id: string, data: UpdateResumeData): Promise<Resume> => {
    const response = await fetch(`/api/resumes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, resumeJsonResponseSchema, "Failed to update resume");
  },
};

// Hook to update a resume
export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResumeData }) =>
      updateResumeApi.update(id, data),
    onSuccess: (updatedResume) => {
      // Update the specific resume in cache
      queryClient.setQueryData(resumesKeys.detail(updatedResume.id), updatedResume);
      // Invalidate resume list to refetch (for default status changes)
      void queryClient.invalidateQueries({ queryKey: resumesKeys.lists() });
      // Invalidate dashboard activity for recent activity
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
