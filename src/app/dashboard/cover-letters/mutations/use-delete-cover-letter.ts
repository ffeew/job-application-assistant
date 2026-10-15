import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CoverLetterJsonResponse as CoverLetter } from "@/lib/validators";
import { readApiError } from "@/lib/api-response";
import { coverLettersKeys } from "../queries/use-cover-letters";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const deleteCoverLetterApi = {
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/cover-letters/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw await readApiError(response, "Failed to delete cover letter");
    }
  },
};

export function useDeleteCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCoverLetterApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Returning undefined leaves a list that was never fetched untouched. A
      // letter opened by its link and then deleted would otherwise seed an
      // empty list and hide every other letter until the cache expired.
      queryClient.setQueryData<CoverLetter[]>(coverLettersKeys.lists(), (old) =>
        old?.filter((letter) => letter.id !== deletedId),
      );
      queryClient.removeQueries({
        queryKey: coverLettersKeys.detail(deletedId),
      });
      void queryClient.invalidateQueries({
        queryKey: coverLettersKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardStatsKeys.stats(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
