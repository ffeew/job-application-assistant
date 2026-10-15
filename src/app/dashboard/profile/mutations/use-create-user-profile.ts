import { userProfileJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateUserProfileRequest,
  UserProfileJsonResponse,
} from "@/app/api/profile/validators";
import { userProfileKeys } from "../queries/use-user-profile";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";

const createUserProfileApi = {
  create: async (
    data: CreateUserProfileRequest,
  ): Promise<UserProfileJsonResponse> => {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      userProfileJsonResponseSchema,
      "Failed to create user profile",
    );
  },
};

export function useCreateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserProfileRequest) =>
      createUserProfileApi.create(data),
    onSuccess: (newProfile) => {
      queryClient.setQueryData(userProfileKeys.profile(), newProfile);
      void queryClient.invalidateQueries({
        queryKey: dashboardStatsKeys.stats(),
      });
    },
  });
}
