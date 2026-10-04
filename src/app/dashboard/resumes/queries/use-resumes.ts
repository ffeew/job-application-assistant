import { resumeJsonResponseSchema } from "@/app/api/resumes/validators";
import { parseJsonResponse, readApiError } from "@/lib/api-response";
import { useQuery } from "@tanstack/react-query";
import type { ResumeJsonResponse as Resume } from "@/app/api/resumes/validators";

// Direct API call functions
const resumesApi = {
  getAll: async (): Promise<Resume[]> => {
    const response = await fetch("/api/resumes");
    return parseJsonResponse(
      response,
      resumeJsonResponseSchema.array(),
      "Failed to fetch resumes",
    );
  },

  getById: async (id: string): Promise<Resume> => {
    const response = await fetch(`/api/resumes/${id}`);
    return parseJsonResponse(
      response,
      resumeJsonResponseSchema,
      "Failed to fetch resume",
    );
  },
};

// Query keys for resumes
export const resumesKeys = {
  all: ["resumes"] as const,
  lists: () => [...resumesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...resumesKeys.lists(), { filters }] as const,
  details: () => [...resumesKeys.all, "detail"] as const,
  detail: (id: string) => [...resumesKeys.details(), id] as const,
};

// Hook to fetch all resumes
export function useResumes() {
  return useQuery({
    queryKey: resumesKeys.lists(),
    queryFn: resumesApi.getAll,
  });
}

// Hook to fetch a single resume
export function useResume(id: string) {
  return useQuery({
    queryKey: resumesKeys.detail(id),
    queryFn: () => resumesApi.getById(id),
    enabled: !!id,
  });
}

export function useSavedResumePDF(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...resumesKeys.detail(id), "pdf"],
    queryFn: async () => {
      const response = await fetch(`/api/resumes/${id}/pdf`);
      if (!response.ok)
        throw await readApiError(
          response,
          "Could not render the saved resume.",
        );
      const bytes = new Uint8Array(await response.arrayBuffer());
      return btoa(
        bytes.reduce((text, byte) => text + String.fromCharCode(byte), ""),
      );
    },
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}
