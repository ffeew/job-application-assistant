import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ResumeJsonResponse as Resume } from '@/lib/validators';
import { resumesKeys } from '../queries/use-resumes';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const deleteResumeApi = {
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/resumes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete resume');
    }
  },
};

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResumeApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Resume[]>(resumesKeys.lists(), (old) =>
        old ? old.filter(resume => resume.id !== deletedId) : []
      );
      queryClient.removeQueries({ queryKey: resumesKeys.detail(deletedId) });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
