import { useMutation, useQueryClient } from "@tanstack/react-query";
import { readApiError } from "@/lib/api-response";
import { resumeUploadsKeys } from "../queries/use-resume-uploads";

export function useDeleteResumeUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(
        `/api/profile/resume-uploads/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          "Couldn't delete the file. Try again.",
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeUploadsKeys.all });
    },
  });
}
