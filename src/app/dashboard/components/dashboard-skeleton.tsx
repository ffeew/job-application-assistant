import { ActivityItemSkeleton } from "./activity-item-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <Card layout="flush" className="flex flex-col gap-6 p-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-4" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card layout="flush">
          <div className="border-b px-6 py-4">
            <Skeleton className="h-6 w-36" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </Card>
        <Card layout="flush" className="flex flex-col gap-3 p-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </Card>
      </div>
    </div>
  );
}
