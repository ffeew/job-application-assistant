import { projectJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectRequest, ProjectJsonResponse } from '@/app/api/profile/validators';
import { projectsKeys } from '../queries/use-projects';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createProjectApi = {
  create: async (data: CreateProjectRequest): Promise<ProjectJsonResponse> => {
    const response = await fetch('/api/profile/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, projectJsonResponseSchema, "Failed to create project");
  },
};

// Hook to create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => createProjectApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
