import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateWorkExperienceRequest, WorkExperienceResponse } from '@/app/api/profile/validators';
import { workExperiencesKeys } from '../queries/use-work-experiences';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateWorkExperienceApi = {
  update: async (id: number, data: UpdateWorkExperienceRequest): Promise<WorkExperienceResponse> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update work experience');
    }
    return response.json();
  },
};

// Hook to update work experience
export function useUpdateWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkExperienceRequest }) =>
      updateWorkExperienceApi.update(id, data),
    onSuccess: (updatedExperience) => {
      queryClient.setQueryData(workExperiencesKeys.detail(updatedExperience.id), updatedExperience);
      queryClient.invalidateQueries({ queryKey: workExperiencesKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
