import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BulkUpdateOrderRequest } from "@/app/api/profile/validators";
import { skillsKeys } from "../queries/use-skills";

const reorderSkillsApi = {
  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch("/api/profile/skills/order", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update skills order");
    }
  },
};

export function useReorderSkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) =>
      reorderSkillsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skillsKeys.all });
    },
  });
}
