import { educationJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateEducationRequest, EducationJsonResponse } from '@/app/api/profile/validators';
import { educationKeys } from '../queries/use-education';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateEducationApi = {
  update: async (id: number, data: UpdateEducationRequest): Promise<EducationJsonResponse> => {
    const response = await fetch(`/api/profile/education/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, educationJsonResponseSchema, "Failed to update education");
  },
};

// Hook to update education
export function useUpdateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEducationRequest }) =>
      updateEducationApi.update(id, data),
    onSuccess: (updatedEducation) => {
      queryClient.setQueryData(educationKeys.detail(updatedEducation.id), updatedEducation);
      void queryClient.invalidateQueries({ queryKey: educationKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
