import { dashboardStatsSchema } from "@/app/api/dashboard/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@/lib/validators";

const dashboardStatsApi = {
  get: async (): Promise<DashboardStats> => {
    const response = await fetch("/api/dashboard/stats");
    return parseJsonResponse(
      response,
      dashboardStatsSchema,
      "Failed to fetch dashboard stats",
    );
  },
};

export const dashboardStatsKeys = {
  all: ["dashboard", "stats"] as const,
  stats: () => [...dashboardStatsKeys.all] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardStatsKeys.stats(),
    queryFn: dashboardStatsApi.get,
    staleTime: 2 * 60 * 1000, // Aggregate counts tolerate a longer refresh interval.
  });
}
