"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
	Plus,
	Briefcase,
	Edit,
	Trash2,
	ExternalLink,
	Calendar,
	FileText,
	ChevronRight,
} from "lucide-react";
import { useApplications } from "@/app/dashboard/applications/queries/use-applications";
import { useDeleteApplication } from "@/app/dashboard/applications/mutations/use-delete-application";
import { ApplicationsListSkeleton } from "./components/applications-list-skeleton";

const statusColors = {
	applied: "bg-[--status-applied-bg] text-[--status-applied]",
	interviewing: "bg-[--status-interviewing-bg] text-[--status-interviewing]",
	offer: "bg-[--status-offer-bg] text-[--status-offer]",
	rejected: "bg-[--status-rejected-bg] text-[--status-rejected]",
	withdrawn: "bg-[--status-withdrawn-bg] text-[--status-withdrawn]",
};

export default function ApplicationsPage() {
	const {
		data: applications = [],
		isLoading,
		error,
		refetch,
	} = useApplications();
	const deleteApplicationMutation = useDeleteApplication();

	const handleDeleteApplication = (id: string) => {
		if (!confirm("Are you sure you want to delete this application?")) {
			return;
		}
		deleteApplicationMutation.mutate(id);
	};

	const getStatusColor = (status: string) => {
		return (
			statusColors[status as keyof typeof statusColors] || statusColors.applied
		);
	};

	if (isLoading) {
		return <ApplicationsListSkeleton />;
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-4">
				<div className="text-lg text-red-600">Error loading applications</div>
				<Button onClick={() => refetch()}>Try Again</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Job Applications</h1>
					<p className="text-muted-foreground">
						Track your job applications and their current status.
					</p>
				</div>
				<Button asChild>
					<Link href="/dashboard/applications/new">
						<Plus className="mr-2 h-4 w-4" />
						New Application
					</Link>
				</Button>
			</div>

			{/* Status Summary */}
			<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
				{Object.entries(statusColors).map(([status, color]) => {
					const count = applications.filter(
						(app) => app.status === status
					).length;
					return (
						<Card key={status}>
							<CardContent className="p-3 sm:p-4">
								<div className="flex items-center justify-between min-w-0">
									<p className="text-sm font-medium capitalize truncate">
										{status}
									</p>
									<Badge className={`${color} ml-2 flex-shrink-0`}>
										{count}
									</Badge>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{applications.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-xl font-semibold mb-2">No applications yet</h3>
						<p className="text-muted-foreground mb-6 text-center max-w-sm">
							Start tracking your job applications to keep organized and never
							miss a follow-up.
						</p>
						<Button asChild>
							<Link href="/dashboard/applications/new">
								<Plus className="mr-2 h-4 w-4" />
								Add Your First Application
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<ResponsiveList
					items={applications}
					getItemId={(app) => app.id}
					renderMobileHeader={(application) => (
						<div className="flex flex-1 items-center gap-3 min-w-0">
							<div className="flex-1 min-w-0">
								<p className="font-medium truncate">{application.company}</p>
								<p className="text-sm text-muted-foreground truncate">
									{application.position}
								</p>
							</div>
							<Badge
								className={`${getStatusColor(application.status)} flex-shrink-0`}
							>
								{application.status}
							</Badge>
							<ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						</div>
					)}
					renderMobileContent={(application) => (
						<div className="flex flex-col gap-4">
							{application.location && (
								<p className="text-sm text-muted-foreground">
									{application.location}
								</p>
							)}
							<div className="flex items-center text-sm text-muted-foreground">
								<Calendar className="mr-1 h-4 w-4" />
								Applied{" "}
								{application.appliedAt
									? new Date(application.appliedAt).toLocaleDateString()
									: new Date(application.createdAt).toLocaleDateString()}
							</div>
							<div className="flex flex-col gap-2">
								<Button size="sm" asChild className="w-full">
									<Link
										href={`/dashboard/applications/${application.id}/resume`}
									>
										<FileText className="mr-2 h-4 w-4" />
										Generate Tailored Resume
									</Link>
								</Button>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="flex-1"
									>
										<Link href={`/dashboard/applications/${application.id}`}>
											<Edit className="mr-2 h-4 w-4" />
											Edit
										</Link>
									</Button>
									{application.jobUrl && (
										<Button variant="outline" size="sm" asChild>
											<Link href={application.jobUrl} target="_blank">
												<ExternalLink className="h-4 w-4" />
											</Link>
										</Button>
									)}
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleDeleteApplication(application.id)}
										disabled={deleteApplicationMutation.isPending}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					)}
					renderDesktopCard={(application) => (
						<Card>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<CardTitle className="text-lg">
											{application.position}
										</CardTitle>
										<CardDescription className="font-medium">
											{application.company}
										</CardDescription>
										{application.location && (
											<p className="text-sm text-muted-foreground mt-1">
												{application.location}
											</p>
										)}
									</div>
									<Badge className={getStatusColor(application.status)}>
										{application.status}
									</Badge>
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex items-center text-sm text-muted-foreground mb-4">
									<Calendar className="mr-1 h-4 w-4" />
									Applied{" "}
									{application.appliedAt
										? new Date(application.appliedAt).toLocaleDateString()
										: new Date(application.createdAt).toLocaleDateString()}
								</div>
								<div className="flex flex-col gap-2">
									<Button size="sm" asChild className="w-full">
										<Link
											href={`/dashboard/applications/${application.id}/resume`}
										>
											<FileText className="mr-2 h-4 w-4" />
											Generate Tailored Resume
										</Link>
									</Button>
									<div className="flex items-center gap-2">
										<Button variant="outline" size="sm" asChild>
											<Link href={`/dashboard/applications/${application.id}`}>
												<Edit className="mr-2 h-4 w-4" />
												Edit
											</Link>
										</Button>
										{application.jobUrl && (
											<Button variant="outline" size="sm" asChild>
												<Link href={application.jobUrl} target="_blank">
													<ExternalLink className="h-4 w-4" />
												</Link>
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDeleteApplication(application.id)}
											disabled={deleteApplicationMutation.isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				/>
			)}
		</div>
	);
}
