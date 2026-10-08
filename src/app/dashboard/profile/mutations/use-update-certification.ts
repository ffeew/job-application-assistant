import { certificationJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateCertificationRequest, CertificationJsonResponse } from '@/app/api/profile/validators';
import { certificationsKeys } from '../queries/use-certifications';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const updateCertificationApi = {
  update: async (id: number, data: UpdateCertificationRequest): Promise<CertificationJsonResponse> => {
    const response = await fetch(`/api/profile/certifications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, certificationJsonResponseSchema, "Failed to update certification");
  },
};

export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCertificationRequest }) =>
      updateCertificationApi.update(id, data),
    onSuccess: (updatedCertification) => {
      queryClient.setQueryData(certificationsKeys.detail(updatedCertification.id), updatedCertification);
      void queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
