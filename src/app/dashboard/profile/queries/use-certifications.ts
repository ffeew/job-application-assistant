import { certificationJsonResponseSchema } from "@/app/api/profile/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from "@tanstack/react-query";
import type {
  CertificationJsonResponse,
  ProfileQuery,
} from "@/app/api/profile/validators";

const certificationsApi = {
  getAll: async (
    query?: ProfileQuery,
  ): Promise<CertificationJsonResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set("limit", query.limit.toString());
    if (query?.offset) searchParams.set("offset", query.offset.toString());
    if (query?.orderBy) searchParams.set("orderBy", query.orderBy);
    if (query?.order) searchParams.set("order", query.order);

    const response = await fetch(`/api/profile/certifications?${searchParams}`);
    return parseJsonResponse(
      response,
      certificationJsonResponseSchema.array(),
      "Failed to fetch certifications",
    );
  },

  getById: async (id: number): Promise<CertificationJsonResponse> => {
    const response = await fetch(`/api/profile/certifications/${id}`);
    return parseJsonResponse(
      response,
      certificationJsonResponseSchema,
      "Failed to fetch certification",
    );
  },
};

export const certificationsKeys = {
  all: ["profile", "certifications"] as const,
  lists: () => [...certificationsKeys.all, "list"] as const,
  list: (query?: ProfileQuery) =>
    [...certificationsKeys.lists(), query] as const,
  details: () => [...certificationsKeys.all, "detail"] as const,
  detail: (id: number) => [...certificationsKeys.details(), id] as const,
};

export function useCertifications(query?: ProfileQuery) {
  return useQuery({
    queryKey: certificationsKeys.list(query),
    queryFn: () => certificationsApi.getAll(query),
  });
}

export function useCertification(id: number) {
  return useQuery({
    queryKey: certificationsKeys.detail(id),
    queryFn: () => certificationsApi.getById(id),
    enabled: !!id,
  });
}
