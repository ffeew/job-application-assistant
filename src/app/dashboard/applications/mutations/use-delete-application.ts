import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApplicationJsonResponse as JobApplication } from '@/lib/validators';
import { applicationsKeys } from '../queries/use-applications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const deleteApplicationApi = {
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete application');
    }
  },
};

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplicationApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<JobApplication[]>(applicationsKeys.lists(), (old) =>
        old ? old.filter(app => app.id !== deletedId) : []
      );
      queryClient.removeQueries({ queryKey: applicationsKeys.detail(deletedId) });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
