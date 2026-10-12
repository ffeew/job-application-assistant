import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ApplicationsListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <Card layout="flush">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-6 border-b px-5 py-4 last:border-b-0"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-40 max-sm:hidden" />
          </div>
        ))}
      </Card>
    </div>
  );
}
