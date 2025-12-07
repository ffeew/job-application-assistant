import { useMutation } from '@tanstack/react-query';
import { resumeImportResponseSchema, type ResumeImportResponse } from '@/app/api/profile/resume-import/validators';

// Direct API call function for resume import
const resumeImportApi = {
  import: async (file: File): Promise<ResumeImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/profile/resume-import', {
      method: 'POST',
      body: formData,
    });

    const raw = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        raw &&
        typeof raw === 'object' &&
        raw !== null &&
        'error' in raw &&
        typeof (raw as { error?: unknown }).error === 'string'
          ? (raw as { error: string }).error
          : 'Failed to import resume. Please try again.';
      throw new Error(errorMessage);
    }

    // Validate response with Zod schema
    return resumeImportResponseSchema.parse(raw);
  },
};

// Hook to import resume
export function useImportResume() {
  return useMutation({
    mutationFn: (file: File) => resumeImportApi.import(file),
  });
}
