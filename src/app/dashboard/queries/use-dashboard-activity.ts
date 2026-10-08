import { dashboardActivitySchema } from "@/app/api/dashboard/validators";
import { parseJsonResponse } from "@/lib/api-response";
import { useQuery } from '@tanstack/react-query';
import type { DashboardActivity } from '@/lib/validators';

const dashboardActivityApi = {
  get: async (): Promise<DashboardActivity> => {
    const response = await fetch('/api/dashboard/activity?limit=10');
    return parseJsonResponse(response, dashboardActivitySchema, "Failed to fetch dashboard activity");
  },
};

export const dashboardActivityKeys = {
  all: ['dashboard', 'activity'] as const,
  activity: () => [...dashboardActivityKeys.all] as const,
};

export function useDashboardActivity() {
  return useQuery({
    queryKey: dashboardActivityKeys.activity(),
    queryFn: dashboardActivityApi.get,
    staleTime: 30 * 1000, // Recent activity needs fresher results than aggregate statistics.
  });
}
