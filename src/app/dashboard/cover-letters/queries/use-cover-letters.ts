import { coverLetterJsonResponseSchema } from "@/app/api/cover-letters/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { CoverLetterJsonResponse as CoverLetter } from '@/lib/validators';

// Direct API call functions
const coverLettersApi = {
  getAll: async (): Promise<CoverLetter[]> => {
    const response = await fetch('/api/cover-letters');
    return parseJsonResponse(response, coverLetterJsonResponseSchema.array(), "Failed to fetch cover letters");
  },

  getById: async (id: string): Promise<CoverLetter> => {
    const response = await fetch(`/api/cover-letters/${id}`);
    return parseJsonResponse(response, coverLetterJsonResponseSchema, "Failed to fetch cover letter");
  },
};

// Query keys for cover letters
export const coverLettersKeys = {
  all: ['cover-letters'] as const,
  lists: () => [...coverLettersKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...coverLettersKeys.lists(), { filters }] as const,
  details: () => [...coverLettersKeys.all, 'detail'] as const,
  detail: (id: string) => [...coverLettersKeys.details(), id] as const,
};

// Hook to fetch all cover letters
export function useCoverLetters() {
  return useQuery({
    queryKey: coverLettersKeys.lists(),
    queryFn: coverLettersApi.getAll,
  });
}

// Hook to fetch a single cover letter
export function useCoverLetter(id: string) {
  return useQuery({
    queryKey: coverLettersKeys.detail(id),
    queryFn: () => coverLettersApi.getById(id),
    enabled: !!id,
  });
}
