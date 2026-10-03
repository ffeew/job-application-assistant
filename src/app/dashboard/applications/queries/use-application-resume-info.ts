import { useQuery } from '@tanstack/react-query';

interface TailoredResumeInfo {
  id: string;
  title: string;
  updatedAt: string;
}

interface ApplicationResumeInfo {
  id: string;
  company: string;
  position: string;
  jobDescription?: string;
  hasJobDescription: boolean;
  location?: string;
  status: string;
  tailoredResume: TailoredResumeInfo | null;
}

// Direct API call function
const applicationResumeInfoApi = {
  get: async (applicationId: string): Promise<ApplicationResumeInfo> => {
    const response = await fetch(`/api/applications/${applicationId}/resume`);
    if (!response.ok) {
      throw new Error('Failed to fetch application info');
    }
    return response.json();
  },
};

// Query keys
export const applicationResumeInfoKeys = {
  all: ['job-application-resume'] as const,
  applicationInfo: (applicationId: string) => [...applicationResumeInfoKeys.all, 'info', applicationId] as const,
};

// Hook to get application info for resume generation
export function useApplicationResumeInfo(applicationId: string) {
  return useQuery({
    queryKey: applicationResumeInfoKeys.applicationInfo(applicationId),
    queryFn: () => applicationResumeInfoApi.get(applicationId),
    enabled: !!applicationId,
  });
}
