import { projectJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from "@tanstack/react-query";
import type {
  ProjectJsonResponse,
  ProfileQuery,
} from "@/app/api/profile/validators";

const projectsApi = {
  getAll: async (query?: ProfileQuery): Promise<ProjectJsonResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set("limit", query.limit.toString());
    if (query?.offset) searchParams.set("offset", query.offset.toString());
    if (query?.orderBy) searchParams.set("orderBy", query.orderBy);
    if (query?.order) searchParams.set("order", query.order);

    const response = await fetch(`/api/profile/projects?${searchParams}`);
    return parseJsonResponse(
      response,
      projectJsonResponseSchema.array(),
      "Failed to fetch projects",
    );
  },

  getById: async (id: number): Promise<ProjectJsonResponse> => {
    const response = await fetch(`/api/profile/projects/${id}`);
    return parseJsonResponse(
      response,
      projectJsonResponseSchema,
      "Failed to fetch project",
    );
  },
};

export const projectsKeys = {
  all: ["profile", "projects"] as const,
  lists: () => [...projectsKeys.all, "list"] as const,
  list: (query?: ProfileQuery) => [...projectsKeys.lists(), query] as const,
  details: () => [...projectsKeys.all, "detail"] as const,
  detail: (id: number) => [...projectsKeys.details(), id] as const,
};

export function useProjects(query?: ProfileQuery) {
  return useQuery({
    queryKey: projectsKeys.list(query),
    queryFn: () => projectsApi.getAll(query),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: projectsKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}
