import { referenceJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateReferenceRequest, ReferenceJsonResponse } from '@/app/api/profile/validators';
import { referencesKeys } from '../queries/use-references';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const createReferenceApi = {
  create: async (data: CreateReferenceRequest): Promise<ReferenceJsonResponse> => {
    const response = await fetch('/api/profile/references', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, referenceJsonResponseSchema, "Failed to create reference");
  },
};

export function useCreateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReferenceRequest) => createReferenceApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: referencesKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
