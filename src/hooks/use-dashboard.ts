import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

// Query keys for dashboard
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
};

// Hook to fetch dashboard statistics
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardApi.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change less frequently
  });
}

// Hook to fetch recent activity
export function useDashboardActivity() {
  return useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: dashboardApi.getActivity,
    staleTime: 30 * 1000, // 30 seconds - activity should be more current
  });
}

// Combined hook for dashboard data (for the dashboard page)
export function useDashboardData() {
  const statsQuery = useDashboardStats();
  const activityQuery = useDashboardActivity();

  return {
    stats: statsQuery.data,
    activity: activityQuery.data || [],
    isLoading: statsQuery.isLoading || activityQuery.isLoading,
    isError: statsQuery.isError || activityQuery.isError,
    error: statsQuery.error || activityQuery.error,
    refetch: () => {
      statsQuery.refetch();
      activityQuery.refetch();
    },
  };
}