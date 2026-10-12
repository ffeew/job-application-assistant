import { Skeleton } from "@/components/ui/skeleton";

export function CoverLetterDetailSkeleton() {
	return (
		<div className="flex max-w-3xl flex-col gap-8">
			<div className="flex flex-col gap-3">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-9 w-72 max-w-full" />
				<Skeleton className="h-5 w-48" />
			</div>
			<Skeleton className="h-10" />
			<Skeleton className="h-96 rounded-none" />
		</div>
	);
}
