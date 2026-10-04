import { dashboardStatsSchema } from "@/app/api/dashboard/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { DashboardStats } from '@/lib/validators';

// Direct API call function
const dashboardStatsApi = {
  get: async (): Promise<DashboardStats> => {
    const response = await fetch('/api/dashboard/stats');
    return parseJsonResponse(response, dashboardStatsSchema, "Failed to fetch dashboard stats");
  },
};

// Query keys for dashboard stats
export const dashboardStatsKeys = {
  all: ['dashboard', 'stats'] as const,
  stats: () => [...dashboardStatsKeys.all] as const,
};

// Hook to fetch dashboard statistics
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardStatsKeys.stats(),
    queryFn: dashboardStatsApi.get,
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change less frequently
  });
}
