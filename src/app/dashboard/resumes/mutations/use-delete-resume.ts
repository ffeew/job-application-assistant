import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ResumeResponse as Resume } from '@/lib/validators';
import { resumesKeys } from '../queries/use-resumes';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
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

// Hook to delete a resume
export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResumeApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from resume list cache
      queryClient.setQueryData<Resume[]>(resumesKeys.lists(), (old) =>
        old ? old.filter(resume => resume.id !== deletedId) : []
      );
      // Remove specific resume from cache
      queryClient.removeQueries({ queryKey: resumesKeys.detail(deletedId) });
      // Invalidate dashboard stats as resume count changed
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      // Invalidate dashboard activity for recent activity
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
