import { userProfileJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { UserProfileJsonResponse } from '@/app/api/profile/validators';

const userProfileApi = {
  get: async (): Promise<UserProfileJsonResponse | null> => {
    const response = await fetch('/api/profile');
    return parseJsonResponse(response, userProfileJsonResponseSchema.nullable(), "Failed to fetch user profile");
  },
};

export const userProfileKeys = {
  all: ['profile', 'user'] as const,
  profile: () => [...userProfileKeys.all] as const,
};

export function useUserProfile() {
  return useQuery({
    queryKey: userProfileKeys.profile(),
    queryFn: userProfileApi.get,
  });
}
