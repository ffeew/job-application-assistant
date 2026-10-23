import { draftAnswersResponseSchema } from "@/app/api/application-answers/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation } from "@tanstack/react-query";
import type {
  DraftAnswersRequest,
  DraftAnswersResponse,
} from "@/lib/validators";

const applicationAnswersApi = {
  draft: async (data: DraftAnswersRequest): Promise<DraftAnswersResponse> => {
    const response = await fetch("/api/application-answers/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return parseJsonResponse(
      response,
      draftAnswersResponseSchema,
      "Couldn't draft the answers. Try again.",
    );
  },
};

export function useDraftApplicationAnswers() {
  return useMutation({
    mutationFn: applicationAnswersApi.draft,
  });
}
