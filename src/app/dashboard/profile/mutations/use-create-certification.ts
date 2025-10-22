import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCertificationRequest, CertificationResponse } from '@/lib/validators/profile.validator';
import { certificationsKeys } from '../queries/use-certifications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const createCertificationApi = {
  create: async (data: CreateCertificationRequest): Promise<CertificationResponse> => {
    const response = await fetch('/api/profile/certifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create certification');
    }
    return response.json();
  },
};

// Hook to create certification
export function useCreateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificationRequest) => createCertificationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
