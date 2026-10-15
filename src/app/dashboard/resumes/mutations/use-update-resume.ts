import { resumeJsonResponseSchema } from "@/app/api/resumes/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ResumeJsonResponse as Resume,
  UpdateResumeRequest as UpdateResumeData,
} from "@/lib/validators";
import { resumesKeys } from "../queries/use-resumes";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const updateResumeApi = {
  update: async (id: string, data: UpdateResumeData): Promise<Resume> => {
    const response = await fetch(`/api/resumes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      resumeJsonResponseSchema,
      "Failed to update resume",
    );
  },
};

export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResumeData }) =>
      updateResumeApi.update(id, data),
    onSuccess: (updatedResume) => {
      queryClient.setQueryData(
        resumesKeys.detail(updatedResume.id),
        updatedResume,
      );
      // Changing the default resume can also change other entries in the list.
      void queryClient.invalidateQueries({ queryKey: resumesKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
