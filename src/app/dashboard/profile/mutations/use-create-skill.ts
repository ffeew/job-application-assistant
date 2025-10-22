import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateSkillRequest, SkillResponse } from '@/app/api/profile/validators';
import { skillsKeys } from '../queries/use-skills';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createSkillApi = {
  create: async (data: CreateSkillRequest): Promise<SkillResponse> => {
    const response = await fetch('/api/profile/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create skill');
    }
    return response.json();
  },
};

// Hook to create skill
export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSkillRequest) => createSkillApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
