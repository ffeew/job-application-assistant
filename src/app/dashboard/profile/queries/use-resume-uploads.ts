import { useQuery } from "@tanstack/react-query";
import {
  resumeUploadsResponseSchema,
  type ResumeUploadsResponse,
} from "@/app/api/profile/resume-uploads/validators";
import { parseJsonResponse } from "@/lib/api-response";

export const resumeUploadsKeys = {
  all: ["profile", "resume-uploads"] as const,
};

export function useResumeUploads() {
  return useQuery({
    queryKey: resumeUploadsKeys.all,
    queryFn: async (): Promise<ResumeUploadsResponse> => {
      const response = await fetch("/api/profile/resume-uploads");
      return parseJsonResponse(
        response,
        resumeUploadsResponseSchema,
        "Failed to fetch imported files",
      );
    },
  });
}
