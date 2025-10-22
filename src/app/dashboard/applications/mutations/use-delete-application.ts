import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApplicationResponse as JobApplication } from '@/lib/validators';
import { applicationsKeys } from '../queries/use-applications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
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

// Hook to delete a job application
export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplicationApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from applications list cache
      queryClient.setQueryData<JobApplication[]>(applicationsKeys.lists(), (old) =>
        old ? old.filter(app => app.id !== deletedId) : []
      );
      // Remove specific application from cache
      queryClient.removeQueries({ queryKey: applicationsKeys.detail(deletedId) });
      // Invalidate dashboard stats as application count changed
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
