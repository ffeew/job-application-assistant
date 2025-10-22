import { useMutation } from '@tanstack/react-query';
import type {
  GenerateCoverLetterRequest as GenerateCoverLetterData,
  GenerateCoverLetterResponse
} from '@/lib/validators';

// Direct API call function
const generateCoverLetterApi = {
  generate: async (data: GenerateCoverLetterData): Promise<GenerateCoverLetterResponse> => {
    const response = await fetch('/api/cover-letters/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate cover letter');
    }
    return response.json();
  },
};

// Hook to generate a cover letter with AI
export function useGenerateCoverLetter() {
  return useMutation({
    mutationFn: (data: GenerateCoverLetterData) => generateCoverLetterApi.generate(data),
    // Note: This doesn't invalidate any queries as it just generates content
  });
}
