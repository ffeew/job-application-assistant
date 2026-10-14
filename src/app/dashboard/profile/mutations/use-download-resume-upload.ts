import { useMutation } from "@tanstack/react-query";
import { readApiError } from "@/lib/api-response";

/** Fetches the file so a failure can be reported instead of opening an error page. */
export function useDownloadResumeUpload() {
  return useMutation({
    mutationFn: async (id: string): Promise<Blob> => {
      const response = await fetch(
        `/api/profile/resume-uploads/${encodeURIComponent(id)}`,
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          "Couldn't download the file. Try again.",
        );
      }
      return response.blob();
    },
  });
}
