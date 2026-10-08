import { certificationJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCertificationRequest, CertificationJsonResponse } from '@/app/api/profile/validators';
import { certificationsKeys } from '../queries/use-certifications';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const createCertificationApi = {
  create: async (data: CreateCertificationRequest): Promise<CertificationJsonResponse> => {
    const response = await fetch('/api/profile/certifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, certificationJsonResponseSchema, "Failed to create certification");
  },
};

export function useCreateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificationRequest) => createCertificationApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
