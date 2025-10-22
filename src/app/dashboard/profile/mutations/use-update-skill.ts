import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateSkillRequest, SkillResponse } from '@/app/api/profile/validators';
import { skillsKeys } from '../queries/use-skills';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateSkillApi = {
  update: async (id: number, data: UpdateSkillRequest): Promise<SkillResponse> => {
    const response = await fetch(`/api/profile/skills/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update skill');
    }
    return response.json();
  },
};

// Hook to update skill
export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSkillRequest }) =>
      updateSkillApi.update(id, data),
    onSuccess: (updatedSkill) => {
      queryClient.setQueryData(skillsKeys.detail(updatedSkill.id), updatedSkill);
      queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
