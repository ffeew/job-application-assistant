import { useMutation } from '@tanstack/react-query';
import { resumeImportResponseSchema, type ResumeImportResponse } from '@/app/api/profile/resume-import/validators';
import { parseJsonResponse } from "@/lib/api-response";

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
  return useMutation({
    mutationFn: (file: File) => resumeImportApi.import(file),
  });
}
