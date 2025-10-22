import { useMutation, useQueryClient } from '@tanstack/react-query';
import { certificationsKeys } from '../queries/use-certifications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const deleteCertificationApi = {
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/certifications/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete certification');
    }
  },
};

// Hook to delete certification
export function useDeleteCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCertificationApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: certificationsKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
