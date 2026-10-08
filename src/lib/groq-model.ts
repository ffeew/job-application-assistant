import type { GroqProviderOptions } from "@ai-sdk/groq";

interface GroqGenerationOptions {
  providerOptions?: { groq: GroqProviderOptions };
  maxOutputTokens?: number;
}

export function getGroqGenerationOptions(
  modelId: string,
  maxOutputTokens?: number,
): GroqGenerationOptions {
  if (modelId !== "qwen/qwen3.8-27b") {
    return { maxOutputTokens };
  }

  // Use provider options: this SDK's generic reasoning mapping predates Qwen 3.8.
  // https://console.groq.com/docs/model/qwen/qwen3.8-27b
  return {
    providerOptions: {
      groq: { reasoningEffort: "none", reasoningFormat: "hidden" },
    },
    maxOutputTokens:
      maxOutputTokens === undefined
        ? undefined
        : Math.min(maxOutputTokens, 16384),
  };
}
