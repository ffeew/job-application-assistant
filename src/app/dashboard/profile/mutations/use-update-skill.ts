import { skillJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateSkillRequest,
  SkillJsonResponse,
} from "@/app/api/profile/validators";
import { skillsKeys } from "../queries/use-skills";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const updateSkillApi = {
  update: async (
    id: number,
    data: UpdateSkillRequest,
  ): Promise<SkillJsonResponse> => {
    const response = await fetch(`/api/profile/skills/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      skillJsonResponseSchema,
      "Failed to update skill",
    );
  },
};

export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSkillRequest }) =>
      updateSkillApi.update(id, data),
    onSuccess: (updatedSkill) => {
      queryClient.setQueryData(
        skillsKeys.detail(updatedSkill.id),
        updatedSkill,
      );
      void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
