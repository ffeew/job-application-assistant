import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  JobApplicationResumeRequest,
  IntelligentContentSelection,
} from '@/lib/validators/profile.validator';

interface ApplicationResumeInfo {
  id: string;
  company: string;
  position: string;
  jobDescription?: string;
  hasJobDescription: boolean;
  location?: string;
  status: string;
}

interface ResumeGenerationResponse {
  html: string;
  aiSelection?: IntelligentContentSelection;
  application: {
    id: string;
    company: string;
    position: string;
  };
}

// Direct API call functions
const jobApplicationResumeApi = {
  getApplicationInfo: async (applicationId: string): Promise<ApplicationResumeInfo> => {
    const response = await fetch(`/api/applications/${applicationId}/resume`);
    if (!response.ok) {
      throw new Error('Failed to fetch application info');
    }
    return response.json();
  },

  generateResume: async (
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

// Query keys
export const jobApplicationResumeKeys = {
  all: ['job-application-resume'] as const,
  applicationInfo: (applicationId: string) => [...jobApplicationResumeKeys.all, 'info', applicationId] as const,
};

// Hook to get application info for resume generation
export function useApplicationResumeInfo(applicationId: string) {
  return useQuery({
    queryKey: jobApplicationResumeKeys.applicationInfo(applicationId),
    queryFn: () => jobApplicationResumeApi.getApplicationInfo(applicationId),
    enabled: !!applicationId,
  });
}

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
      const result = await jobApplicationResumeApi.generateResume(applicationId, data, format);

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