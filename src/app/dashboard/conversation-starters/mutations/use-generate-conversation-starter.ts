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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "Failed to generate conversation starter",
      );
    }

    return response.json();
  },
};

export function useGenerateConversationStarter() {
  return useMutation({
    mutationFn: conversationStarterApi.generate,
  });
}
