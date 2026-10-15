import { coverLetterJsonResponseSchema } from "@/app/api/cover-letters/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CoverLetterJsonResponse as CoverLetter,
  CreateCoverLetterRequest as CreateCoverLetterData,
} from "@/lib/validators";
import { coverLettersKeys } from "../queries/use-cover-letters";
import { dashboardStatsKeys } from "@/app/dashboard/queries/use-dashboard-stats";
import { dashboardActivityKeys } from "@/app/dashboard/queries/use-dashboard-activity";

const createCoverLetterApi = {
  create: async (data: CreateCoverLetterData): Promise<CoverLetter> => {
    const response = await fetch("/api/cover-letters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(
      response,
      coverLetterJsonResponseSchema,
      "Failed to create cover letter",
    );
  },
};

export function useCreateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCoverLetterData) =>
      createCoverLetterApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: coverLettersKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardStatsKeys.stats(),
      });
      void queryClient.invalidateQueries({
        queryKey: dashboardActivityKeys.activity(),
      });
    },
  });
}
