import { userProfileJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateUserProfileRequest, UserProfileJsonResponse } from '@/app/api/profile/validators';
import { userProfileKeys } from '../queries/use-user-profile';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

const updateUserProfileApi = {
  update: async (data: UpdateUserProfileRequest): Promise<UserProfileJsonResponse> => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, userProfileJsonResponseSchema, "Failed to update user profile");
  },
};

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserProfileRequest) => updateUserProfileApi.update(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(userProfileKeys.profile(), updatedProfile);
      void queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
