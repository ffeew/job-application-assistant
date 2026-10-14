import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileItemSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Card layout="flush">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border-b px-5 py-4 last:border-b-0"
          >
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </Card>
    </div>
  );
}
