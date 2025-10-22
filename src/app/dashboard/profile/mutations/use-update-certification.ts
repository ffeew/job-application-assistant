import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateCertificationRequest, CertificationResponse } from '@/app/api/profile/validators';
import { certificationsKeys } from '../queries/use-certifications';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateCertificationApi = {
  update: async (id: number, data: UpdateCertificationRequest): Promise<CertificationResponse> => {
    const response = await fetch(`/api/profile/certifications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update certification');
    }
    return response.json();
  },
};

// Hook to update certification
export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCertificationRequest }) =>
      updateCertificationApi.update(id, data),
    onSuccess: (updatedCertification) => {
      queryClient.setQueryData(certificationsKeys.detail(updatedCertification.id), updatedCertification);
      queryClient.invalidateQueries({ queryKey: certificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
