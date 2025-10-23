import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileItemSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex justify-between items-start">
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-9 rounded" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </CardContent>
    </Card>
  );
}
