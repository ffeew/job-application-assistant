import { useQuery } from '@tanstack/react-query';
import type { UserProfileResponse } from '@/lib/validators/profile.validator';

// Direct API call function
const userProfileApi = {
  get: async (): Promise<UserProfileResponse | null> => {
    const response = await fetch('/api/profile');
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  },
};

// Query keys for user profile
export const userProfileKeys = {
  all: ['profile', 'user'] as const,
  profile: () => [...userProfileKeys.all] as const,
};

// Hook to fetch user profile
export function useUserProfile() {
  return useQuery({
    queryKey: userProfileKeys.profile(),
    queryFn: userProfileApi.get,
  });
}
