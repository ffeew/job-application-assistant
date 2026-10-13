import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApplicationJsonResponse as JobApplication } from "@/lib/validators";
import { readApiError } from "@/lib/api-response";
import { applicationsKeys } from "../queries/use-applications";
import { coverLettersKeys } from "@/app/dashboard/cover-letters/queries/use-cover-letters";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const deleteApplicationApi = {
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw await readApiError(response, "Failed to delete application");
    }
  },
};

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplicationApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Returning undefined leaves a list that was never fetched untouched.
      // Seeding it with [] would show an empty tracker until the cache expired.
      queryClient.setQueryData<JobApplication[]>(applicationsKeys.lists(), (old) =>
        old?.filter((app) => app.id !== deletedId),
      );
      queryClient.removeQueries({ queryKey: applicationsKeys.detail(deletedId) });
      void queryClient.invalidateQueries({ queryKey: applicationsKeys.lists() });
      // The database removes an application's cover letters with it.
      void queryClient.invalidateQueries({ queryKey: coverLettersKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
