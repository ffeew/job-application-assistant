import { useQuery } from '@tanstack/react-query';
import type { DashboardActivity } from '@/lib/validators';

// Direct API call function
const dashboardActivityApi = {
  get: async (): Promise<DashboardActivity> => {
    const response = await fetch('/api/dashboard/activity?limit=10');
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard activity');
    }
    return response.json();
  },
};

// Query keys for dashboard activity
export const dashboardActivityKeys = {
  all: ['dashboard', 'activity'] as const,
  activity: () => [...dashboardActivityKeys.all] as const,
};

// Hook to fetch recent activity
export function useDashboardActivity() {
  return useQuery({
    queryKey: dashboardActivityKeys.activity(),
    queryFn: dashboardActivityApi.get,
    staleTime: 30 * 1000, // 30 seconds - activity should be more current
  });
}
