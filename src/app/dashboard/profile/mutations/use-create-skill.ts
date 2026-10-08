import { skillJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateSkillRequest, SkillJsonResponse } from '@/app/api/profile/validators';
import { skillsKeys } from '../queries/use-skills';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const createSkillApi = {
  create: async (data: CreateSkillRequest): Promise<SkillJsonResponse> => {
    const response = await fetch('/api/profile/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, skillJsonResponseSchema, "Failed to create skill");
  },
};

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSkillRequest) => createSkillApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
