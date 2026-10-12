"use client";

import { useState } from "react";
import { withAsyncHandler } from "@/lib/async-action";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Notice } from "@/components/ui/notice";
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useApplications } from "@/app/dashboard/applications/queries/use-applications";
import { useDeleteApplication } from "@/app/dashboard/applications/mutations/use-delete-application";
import type { ApplicationJsonResponse } from "@/app/api/applications/validators";
import { EmptyState } from "@/app/dashboard/components/empty-state";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { formatShortDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { ApplicationsListSkeleton } from "./components/applications-list-skeleton";
import {
	applicationStatuses,
	statusFills,
	statusLabels,
	StatusMark,
	type ApplicationStatus,
} from "./components/status-mark";

// One grid shared by the heading row and every application row. Fixed tracks
// keep the columns aligned, and the container query stacks rows when the panel
// itself is narrow rather than the viewport.
const rowGrid =
	"@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_8.5rem_7rem_18rem] @4xl:items-center @4xl:gap-x-6";

export default function ApplicationsPage() {
	const {
		data: applications = [],
		isLoading,
		error,
		refetch,
	} = useApplications();
	const deleteApplicationMutation = useDeleteApplication();
	const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
	const [pendingDelete, setPendingDelete] =
		useState<ApplicationJsonResponse | null>(null);

	if (isLoading) {
		return <ApplicationsListSkeleton />;
	}

	const addButton = (
		<Button asChild>
			<Link href="/dashboard/applications/new">
				<Plus />
				Add application
			</Link>
		</Button>
	);

	if (error) {
		return (
			<div className="flex flex-col gap-8">
				<PageHeader title="Applications" />
				<Notice tone="error" title="Your applications didn't load">
					<p>{error.message}</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-3"
						onClick={withAsyncHandler(() => refetch())}
					>
						Try again
					</Button>
				</Notice>
			</div>
		);
	}

	const countFor = (status: ApplicationStatus) =>
		applications.filter((application) => application.status === status).length;
	const visible =
		filter === "all"
			? applications
			: applications.filter((application) => application.status === filter);

	const filterButton = (
		value: ApplicationStatus | "all",
		label: string,
		count: number,
	) => (
		<button
			key={value}
			type="button"
			aria-pressed={filter === value}
			onClick={() => setFilter(value)}
			className={cn(
				"flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors",
				filter === value
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-card hover:bg-secondary",
			)}
		>
			{value !== "all" && (
				<span
					aria-hidden="true"
					className={cn("size-2.5 rounded-[2px]", statusFills[value])}
				/>
			)}
			{label}
			<span className="tabular-nums opacity-70">{count}</span>
		</button>
	);

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title="Applications"
				description="Every job you are applying to, with its status and the resume you tailored for it."
				actions={addButton}
			/>

			{applications.length === 0 ? (
				<EmptyState title="No applications yet" actions={addButton}>
					Add the first job you want to apply to. Paste in its listing and
					you can tailor a resume to it.
				</EmptyState>
			) : (
				<div className="flex flex-col gap-4">
					<div
						role="group"
						aria-label="Filter by status"
						className="flex flex-wrap gap-2"
					>
						{filterButton("all", "All", applications.length)}
						{applicationStatuses.map((status) =>
							filterButton(status, statusLabels[status], countFor(status)),
						)}
					</div>

					<Card layout="flush" className="@container">
						{/* Each cell names itself, so the heading row is visual only. */}
						<div
							aria-hidden="true"
							className={cn(
								"text-muted-foreground hidden border-b px-5 py-3 text-sm font-medium",
								rowGrid,
							)}
						>
							<span>Position</span>
							<span>Status</span>
							<span>Applied</span>
						</div>

						{visible.length === 0 ? (
							<p className="text-muted-foreground px-5 py-8 text-sm">
								No applications with this status.
							</p>
						) : (
							<ul>
								{visible.map((application) => (
									<li
										key={application.id}
										className={cn(
											"flex flex-col gap-3 border-b px-5 py-4 last:border-b-0",
											rowGrid,
										)}
									>
										<div className="min-w-0">
											<p className="truncate font-semibold">
												{application.position}
											</p>
											<p className="text-muted-foreground flex flex-wrap gap-x-2 text-sm">
												<span>{application.company}</span>
												{application.location && (
													<span>{application.location}</span>
												)}
											</p>
										</div>
										<div className="flex flex-wrap items-center gap-x-6 gap-y-1 @4xl:contents">
											<StatusMark status={application.status} />
											<p className="text-muted-foreground text-sm tabular-nums">
												<span className="@4xl:sr-only">Applied </span>
												{formatShortDate(
													application.appliedAt ?? application.createdAt,
												)}
											</p>
										</div>
										<div className="flex flex-wrap items-center gap-1">
											<Button variant="outline" size="sm" asChild>
												<Link
													href={`/dashboard/applications/${application.id}/resume`}
												>
													<FileText />
													Tailor resume
												</Link>
											</Button>
											<Button variant="ghost" size="sm" asChild>
												<Link href={`/dashboard/applications/${application.id}`}>
													<Pencil />
													Edit
												</Link>
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Delete application at ${application.company}`}
												onClick={() => setPendingDelete(application)}
												disabled={deleteApplicationMutation.isPending}
											>
												<Trash2 />
											</Button>
											{application.jobUrl && (
												<Button variant="ghost" size="icon-sm" asChild>
													<a
														href={application.jobUrl}
														target="_blank"
														rel="noopener noreferrer"
														aria-label={`Open the listing at ${application.company}`}
													>
														<ExternalLink />
													</a>
												</Button>
											)}
										</div>
									</li>
								))}
							</ul>
						)}
					</Card>
				</div>
			)}

			<ConfirmDeleteDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
				title="Delete this application?"
				description={
					pendingDelete &&
					`${pendingDelete.position} at ${pendingDelete.company} will be removed from your tracker. This can't be undone.`
				}
				onConfirm={() => {
					if (!pendingDelete) return;
					deleteApplicationMutation.mutate(pendingDelete.id, {
						onSuccess: () => toast.success("Application deleted"),
						onError: () =>
							toast.error("Couldn't delete the application. Try again."),
					});
					setPendingDelete(null);
				}}
			/>
		</div>
	);
}
