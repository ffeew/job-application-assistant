import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectRequest, ProjectResponse } from '@/lib/validators/profile.validator';
import { projectsKeys } from '../queries/use-projects';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createProjectApi = {
  create: async (data: CreateProjectRequest): Promise<ProjectResponse> => {
    const response = await fetch('/api/profile/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    return response.json();
  },
};

// Hook to create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => createProjectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
