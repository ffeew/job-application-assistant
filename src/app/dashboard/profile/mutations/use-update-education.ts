import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateEducationRequest, EducationResponse } from '@/app/api/profile/validators';
import { educationKeys } from '../queries/use-education';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateEducationApi = {
  update: async (id: number, data: UpdateEducationRequest): Promise<EducationResponse> => {
    const response = await fetch(`/api/profile/education/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update education');
    }
    return response.json();
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
      queryClient.invalidateQueries({ queryKey: educationKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
