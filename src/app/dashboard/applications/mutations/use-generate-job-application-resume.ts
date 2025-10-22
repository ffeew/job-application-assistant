import { useMutation } from '@tanstack/react-query';
import type {
  JobApplicationResumeRequest,
  IntelligentContentSelection,
} from '@/lib/validators/profile.validator';

interface ResumeGenerationResponse {
  html: string;
  aiSelection?: IntelligentContentSelection;
  application: {
    id: string;
    company: string;
    position: string;
  };
}

// Direct API call function
const jobApplicationResumeApi = {
  generate: async (
    applicationId: string,
    data: Omit<JobApplicationResumeRequest, 'applicationId'>,
    format: 'html' | 'pdf' | 'preview' = 'html'
  ): Promise<ResumeGenerationResponse | Blob> => {
    const response = await fetch(`/api/applications/${applicationId}/resume?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate resume');
    }

    if (format === 'pdf') {
      return response.blob();
    }

    return response.json();
  },
};

// Hook to generate job application resume
export function useJobApplicationResumeGeneration() {
  return useMutation({
    mutationFn: async ({
      applicationId,
      data,
      format = 'html',
    }: {
      applicationId: string;
      data: Omit<JobApplicationResumeRequest, 'applicationId'>;
      format?: 'html' | 'pdf' | 'preview';
    }) => {
      const result = await jobApplicationResumeApi.generate(applicationId, data, format);

      if (format === 'pdf' && result instanceof Blob) {
        // Handle PDF download
        const url = URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, format: 'pdf' };
      }

      return result as ResumeGenerationResponse;
    },
  });
}

// Convenience hooks for different formats
export function useGenerateJobApplicationPDF() {
  const mutation = useJobApplicationResumeGeneration();

  return {
    generatePDF: (applicationId: string, data: Omit<JobApplicationResumeRequest, 'applicationId'>) =>
      mutation.mutate({ applicationId, data, format: 'pdf' }),
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}

export function useGenerateJobApplicationPreview() {
  const mutation = useJobApplicationResumeGeneration();

  return {
    generatePreview: async (applicationId: string, data: Omit<JobApplicationResumeRequest, 'applicationId'>) => {
      const result = await mutation.mutateAsync({ applicationId, data, format: 'preview' });
      return result as ResumeGenerationResponse;
    },
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}

export function useGenerateJobApplicationHTML() {
  const mutation = useJobApplicationResumeGeneration();

  return {
    generateHTML: async (applicationId: string, data: Omit<JobApplicationResumeRequest, 'applicationId'>) => {
      const result = await mutation.mutateAsync({ applicationId, data, format: 'html' });
      return result as ResumeGenerationResponse;
    },
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}
