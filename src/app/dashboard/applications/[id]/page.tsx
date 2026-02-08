"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useApplication } from "@/app/dashboard/applications/queries/use-applications";
import { useUpdateApplication } from "@/app/dashboard/applications/mutations/use-update-application";
import { updateApplicationSchema } from "@/app/api/applications/validators";
import type { UpdateApplicationRequest } from "@/app/api/applications/validators";
import { ApplicationDetailSkeleton } from "../components/application-detail-skeleton";

export default function EditApplicationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
		null
	);
	const router = useRouter();
	const {
		data: application,
		isLoading,
		error,
	} = useApplication(resolvedParams?.id || "");
	const updateApplicationMutation = useUpdateApplication();

	const form = useForm({
		resolver: zodResolver(updateApplicationSchema),
		defaultValues: {
			company: "",
			position: "",
			jobDescription: "",
			location: "",
			jobUrl: "",
			salaryRange: "",
			status: "applied" as const,
			appliedAt: "",
			notes: "",
			contactEmail: "",
			contactName: "",
			recruiterId: "",
		},
	});

	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors, isSubmitting },
	} = form;

	// Resolve params Promise
	useEffect(() => {
		const resolveParams = async () => {
			const resolved = await params;
			setResolvedParams(resolved);
		};
		resolveParams();
	}, [params]);

	// Reset form with application data when loaded
	useEffect(() => {
		if (application) {
			reset({
				company: application.company || "",
				position: application.position || "",
				jobDescription: application.jobDescription || "",
				location: application.location || "",
				jobUrl: application.jobUrl || "",
				salaryRange: application.salaryRange || "",
				status: application.status || "applied",
				appliedAt: application.appliedAt
					? new Date(application.appliedAt).toISOString().split("T")[0]
					: "",
				notes: application.notes || "",
				contactEmail: application.contactEmail || "",
				contactName: application.contactName || "",
				recruiterId: application.recruiterId || "",
			});
		}
	}, [application, reset]);

	useEffect(() => {
		if (error) {
			router.push("/dashboard/applications");
		}
	}, [error, router]);

	const onSubmit = async (data: unknown) => {
		// Data is validated by Zod resolver, safe to cast
		const validatedData = data as UpdateApplicationRequest;

		updateApplicationMutation.mutate(
			{ id: resolvedParams?.id || "", data: validatedData },
			{
				onSuccess: () => {
					toast.success("Application updated successfully!");
					router.push("/dashboard/applications");
				},
				onError: (error) => {
					console.error("Error updating application:", error);
					toast.error("Error updating application. Please try again.");
				},
			}
		);
	};

	if (!resolvedParams || isLoading) {
		return <ApplicationDetailSkeleton />;
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/applications">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Applications
						</Link>
					</Button>
					<div>
						<h1 className="text-3xl font-bold">Edit Application</h1>
						<p className="text-muted-foreground">
							Update your job application details.
						</p>
					</div>
				</div>

				{application && (
					<Button asChild className="shrink-0">
						<Link href={`/dashboard/applications/${resolvedParams?.id}/resume`}>
							<FileText className="mr-2 h-4 w-4" />
							<span className="hidden sm:inline">Generate Tailored Resume</span>
							<span className="sm:hidden">Resume</span>
						</Link>
					</Button>
				)}
			</div>

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className="grid gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Job Details</CardTitle>
							<CardDescription>
								Basic information about the job opportunity
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="company">Company *</Label>
									<Input
										id="company"
										placeholder="e.g., Google"
										{...register("company")}
									/>
									{errors.company && (
										<p className="text-red-500 text-sm mt-1">
											{errors.company.message}
										</p>
									)}
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="position">Position *</Label>
									<Input
										id="position"
										placeholder="e.g., Software Engineer"
										{...register("position")}
									/>
									{errors.position && (
										<p className="text-red-500 text-sm mt-1">
											{errors.position.message}
										</p>
									)}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="status">Status</Label>
									<Controller
										name="status"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="applied">Applied</SelectItem>
													<SelectItem value="interviewing">
														Interviewing
													</SelectItem>
													<SelectItem value="offer">Offer</SelectItem>
													<SelectItem value="rejected">Rejected</SelectItem>
													<SelectItem value="withdrawn">Withdrawn</SelectItem>
												</SelectContent>
											</Select>
										)}
									/>
									{errors.status && (
										<p className="text-red-500 text-sm mt-1">
											{errors.status.message}
										</p>
									)}
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="appliedAt">Application Date</Label>
									<Input
										id="appliedAt"
										type="date"
										{...register("appliedAt")}
									/>
									{errors.appliedAt && (
										<p className="text-red-500 text-sm mt-1">
											{errors.appliedAt.message}
										</p>
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Additional Details</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="location">Location</Label>
								<Input
									id="location"
									placeholder="e.g., San Francisco, CA"
									{...register("location")}
								/>
								{errors.location && (
									<p className="text-red-500 text-sm mt-1">
										{errors.location.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="notes">Notes</Label>
								<Textarea
									id="notes"
									placeholder="Add any notes about this application..."
									{...register("notes")}
									rows={4}
								/>
								{errors.notes && (
									<p className="text-red-500 text-sm mt-1">
										{errors.notes.message}
									</p>
								)}
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-end gap-4">
						<Button variant="outline" asChild>
							<Link href="/dashboard/applications">Cancel</Link>
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || updateApplicationMutation.isPending}
						>
							<Save className="mr-2 h-4 w-4" />
							{isSubmitting || updateApplicationMutation.isPending
								? "Saving..."
								: "Save Changes"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
