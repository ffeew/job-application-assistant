import type { QueryClient } from "@tanstack/react-query";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { useDashboardStore } from "@/app/dashboard/store/use-dashboard-store";

/**
 * Drops what the browser holds in memory about the signed-in account. Query
 * keys are not scoped to a user and sign-in is a client-side navigation, so
 * without this the next account at the same browser is shown the previous
 * one's cached records.
 */
export function clearAccountState(queryClient: QueryClient): void {
  queryClient.clear();
  useImportReviewStore.getState().clear();
  useDashboardStore.getState().setUser(null);
}
