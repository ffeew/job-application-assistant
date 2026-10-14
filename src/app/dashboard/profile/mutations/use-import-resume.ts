import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resumeImportResponseSchema, type ResumeImportResponse } from '@/app/api/profile/resume-import/validators';
import { parseJsonResponse } from "@/lib/api-response";
import { resumeUploadsKeys } from '../queries/use-resume-uploads';

const resumeImportApi = {
  import: async (file: File): Promise<ResumeImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/profile/resume-import', {
      method: 'POST',
      body: formData,
    });

    return parseJsonResponse(
      response,
      resumeImportResponseSchema,
      "Failed to import resume. Please try again.",
    );
  },
};

export function useImportResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => resumeImportApi.import(file),
    // The server keeps the original of a file it could read.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeUploadsKeys.all });
    },
  });
}
