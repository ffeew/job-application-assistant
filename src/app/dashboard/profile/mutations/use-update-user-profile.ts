import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateUserProfileRequest, UserProfileResponse } from '@/app/api/profile/validators';
import { userProfileKeys } from '../queries/use-user-profile';
import { dashboardActivityKeys } from '@/app/dashboard/queries/use-dashboard-activity';

// Direct API call function
const updateUserProfileApi = {
  update: async (data: UpdateUserProfileRequest): Promise<UserProfileResponse> => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }
    return response.json();
  },
};

// Hook to update user profile
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserProfileRequest) => updateUserProfileApi.update(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(userProfileKeys.profile(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: dashboardActivityKeys.activity() });
    },
  });
}
