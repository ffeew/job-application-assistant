import { referenceJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateReferenceRequest, ReferenceJsonResponse } from '@/app/api/profile/validators';
import { referencesKeys } from '../queries/use-references';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateReferenceApi = {
  update: async (id: number, data: UpdateReferenceRequest): Promise<ReferenceJsonResponse> => {
    const response = await fetch(`/api/profile/references/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, referenceJsonResponseSchema, "Failed to update reference");
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
      void queryClient.invalidateQueries({ queryKey: referencesKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
