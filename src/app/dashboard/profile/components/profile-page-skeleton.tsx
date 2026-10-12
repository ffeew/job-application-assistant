import { Skeleton } from "@/components/ui/skeleton";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

export function ProfilePageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="flex min-w-0 gap-1 overflow-hidden lg:flex-col">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 shrink-0 lg:w-full" />
          ))}
        </div>
        <div className="max-w-3xl">
          <ProfileItemSkeleton />
        </div>
      </div>
    </div>
  );
}
