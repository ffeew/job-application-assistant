import { Skeleton } from "@/components/ui/skeleton";

export function ApplicationDetailSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      {Array.from({ length: 2 }).map((_, section) => (
        <div
          key={section}
          className="grid gap-x-10 gap-y-4 lg:grid-cols-[14rem_minmax(0,1fr)]"
        >
          <Skeleton className="h-6 w-28" />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-10" />
            <Skeleton className="h-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
