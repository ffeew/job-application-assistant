import { Skeleton } from "@/components/ui/skeleton";
import { WorkbenchSkeleton } from "./resume-workbench";

export function ResumeDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      <WorkbenchSkeleton />
    </div>
  );
}
