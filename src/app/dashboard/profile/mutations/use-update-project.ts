import { projectJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateProjectRequest, ProjectJsonResponse } from '@/app/api/profile/validators';
import { projectsKeys } from '../queries/use-projects';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateProjectApi = {
  update: async (id: number, data: UpdateProjectRequest): Promise<ProjectJsonResponse> => {
    const response = await fetch(`/api/profile/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, projectJsonResponseSchema, "Failed to update project");
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
      void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
