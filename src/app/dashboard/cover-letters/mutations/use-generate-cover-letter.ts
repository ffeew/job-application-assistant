import { generateCoverLetterResponseSchema } from "@/app/api/cover-letters/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useMutation } from '@tanstack/react-query';
import type {
  GenerateCoverLetterRequest as GenerateCoverLetterData,
  GenerateCoverLetterResponse
} from '@/lib/validators';

const generateCoverLetterApi = {
  generate: async (data: GenerateCoverLetterData): Promise<GenerateCoverLetterResponse> => {
    const response = await fetch('/api/cover-letters/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(response, generateCoverLetterResponseSchema, "Failed to generate cover letter");
  },
};

export function useGenerateCoverLetter() {
  return useMutation({
    mutationFn: (data: GenerateCoverLetterData) => generateCoverLetterApi.generate(data),
    // Generated text remains a draft until it is saved.
  });
}
