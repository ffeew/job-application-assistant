import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateProjectRequest, ProjectResponse } from '@/app/api/profile/validators';
import { projectsKeys } from '../queries/use-projects';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateProjectApi = {
  update: async (id: number, data: UpdateProjectRequest): Promise<ProjectResponse> => {
    const response = await fetch(`/api/profile/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update project');
    }
    return response.json();
  },
};

// Hook to update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      updateProjectApi.update(id, data),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(projectsKeys.detail(updatedProject.id), updatedProject);
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
