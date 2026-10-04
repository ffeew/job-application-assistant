import { generateConversationStarterResponseSchema } from "@/app/api/conversation-starters/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation } from "@tanstack/react-query";
import type {
  GenerateConversationStarterRequest,
  GenerateConversationStarterResponse,
} from "@/lib/validators";

const conversationStarterApi = {
  generate: async (
    data: GenerateConversationStarterRequest,
  ): Promise<GenerateConversationStarterResponse> => {
    const response = await fetch("/api/conversation-starters/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return parseJsonResponse(response, generateConversationStarterResponseSchema, "Failed to generate conversation starter");
  },
};

export function useGenerateConversationStarter() {
  return useMutation({
    mutationFn: conversationStarterApi.generate,
  });
}
