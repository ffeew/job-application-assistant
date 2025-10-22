import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateUserProfileRequest, UserProfileResponse } from '@/app/api/profile/validators';
import { userProfileKeys } from '../queries/use-user-profile';
import { dashboardStatsKeys } from '@/app/dashboard/queries/use-dashboard-stats';

// Direct API call function
const createUserProfileApi = {
  create: async (data: CreateUserProfileRequest): Promise<UserProfileResponse> => {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }
    return response.json();
  },
};

// Hook to create user profile
export function useCreateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserProfileRequest) => createUserProfileApi.create(data),
    onSuccess: (newProfile) => {
      queryClient.setQueryData(userProfileKeys.profile(), newProfile);
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.stats() });
    },
  });
}
