import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateReferenceRequest, ReferenceResponse } from '@/lib/validators/profile.validator';
import { referencesKeys } from '../queries/use-references';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateReferenceApi = {
  update: async (id: number, data: UpdateReferenceRequest): Promise<ReferenceResponse> => {
    const response = await fetch(`/api/profile/references/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update reference');
    }
    return response.json();
  },
};

// Hook to update reference
export function useUpdateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReferenceRequest }) =>
      updateReferenceApi.update(id, data),
    onSuccess: (updatedReference) => {
      queryClient.setQueryData(referencesKeys.detail(updatedReference.id), updatedReference);
      queryClient.invalidateQueries({ queryKey: referencesKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
