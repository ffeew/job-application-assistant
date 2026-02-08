"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Plus,
	Edit,
	Trash2,
	Briefcase,
	Calendar,
	MapPin,
	Save,
	Loader2,
	Check,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useCreateWorkExperience } from "@/app/dashboard/profile/mutations/use-create-work-experience";
import { useUpdateWorkExperience } from "@/app/dashboard/profile/mutations/use-update-work-experience";
import { useDeleteWorkExperience } from "@/app/dashboard/profile/mutations/use-delete-work-experience";
import { createWorkExperienceSchema } from "@/app/api/profile/validators";
import type {
	WorkExperienceResponse,
	CreateWorkExperienceRequest,
} from "@/app/api/profile/validators";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

interface ExperienceSectionProps {
	experiences: WorkExperienceResponse[];
	isLoading: boolean;
}

export function ExperienceSection({ experiences, isLoading }: ExperienceSectionProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const editingState = useProfileUIStore((state) => state.editingState);
	const isSheetOpen = useProfileUIStore((state) => state.isSheetOpen);
	const startAdding = useProfileUIStore((state) => state.startAdding);
	const startEditing = useProfileUIStore((state) => state.startEditing);
	const cancelEditing = useProfileUIStore((state) => state.cancelEditing);
	const savingItemId = useProfileUIStore((state) => state.savingItemId);
	const setSavingItemId = useProfileUIStore((state) => state.setSavingItemId);
	const editingPendingId = useProfileUIStore((state) => state.editingPendingId);
	const startEditingPending = useProfileUIStore((state) => state.startEditingPending);
	const cancelEditingPending = useProfileUIStore((state) => state.cancelEditingPending);

	const pendingItems = useImportReviewStore((state) => state.workExperiences);
	const updatePendingItem = useImportReviewStore((state) => state.updateWorkExperienceDraft);
	const removePendingItem = useImportReviewStore((state) => state.removeWorkExperienceDraft);

	const createMutation = useCreateWorkExperience();
	const deleteMutation = useDeleteWorkExperience();

	const isEditingExperience =
		isSheetOpen && editingState?.section === "experience";

	const editingExperience = isEditingExperience && editingState?.itemId
		? experiences.find((e) => e.id === editingState.itemId)
		: null;

	const handleDelete = () => {
		if (deleteId === null) return;
		deleteMutation.mutate(deleteId, {
			onSuccess: () => {
				toast.success("Work experience deleted successfully!");
				setDeleteId(null);
			},
			onError: (error) => {
				console.error("Error deleting work experience:", error);
				toast.error("Error deleting work experience. Please try again.");
			},
		});
	};

	const handleSavePending = async (id: string, data: CreateWorkExperienceRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Work experience saved to your profile.");
		} catch (error) {
			console.error("Failed to save work experience:", error);
			toast.error("Failed to save work experience. Please try again.");
		} finally {
			setSavingItemId(null);
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		const [year, month] = dateString.split("-");
		const months = [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		];
		return `${months[parseInt(month) - 1]} ${year}`;
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<ProfileItemSkeleton key={i} />
				))}
			</div>
		);
	}

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<Briefcase className="h-6 w-6" />
							Work Experience
						</h1>
						<p className="text-muted-foreground">Your professional work history</p>
					</div>
					<Button onClick={() => startAdding("experience")}>
						<Plus className="mr-2 h-4 w-4" />
						Add Experience
					</Button>
				</div>

				{/* Pending imports */}
				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6 space-y-4">
							<div>
								<p className="text-sm font-semibold text-primary">
									{pendingItems.length} pending work experience{pendingItems.length !== 1 ? "s" : ""} from import
								</p>
								<p className="text-xs text-primary/80">
									Review, edit, or save these entries individually.
								</p>
							</div>
							<div className="space-y-3">
								{pendingItems.map((item) => (
									<div
										key={item.id}
										className="rounded-md border border-primary/20 bg-background p-4"
									>
										{editingPendingId === item.id ? (
											<PendingEditForm
												initialValues={item.request}
												onSave={(data) => {
													updatePendingItem(item.id, data);
													cancelEditingPending();
													toast.success("Draft updated.");
												}}
												onCancel={cancelEditingPending}
											/>
										) : (
											<div className="flex items-start justify-between">
												<div className="space-y-1">
													<p className="font-medium">
														{item.request.jobTitle} at {item.request.company}
													</p>
													{item.request.location && (
														<p className="text-sm text-muted-foreground">
															{item.request.location}
														</p>
													)}
													{item.warnings.length > 0 && (
														<ul className="list-disc space-y-1 pl-4 text-xs text-amber-600">
															{item.warnings.map((warning, idx) => (
																<li key={idx}>{warning}</li>
															))}
														</ul>
													)}
												</div>
												<div className="flex gap-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => startEditingPending(item.id)}
														disabled={savingItemId === item.id}
													>
														<Edit className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => removePendingItem(item.id)}
														disabled={savingItemId === item.id}
													>
														<X className="h-4 w-4" />
													</Button>
													<Button
														size="sm"
														onClick={() => handleSavePending(item.id, item.request)}
														disabled={savingItemId === item.id}
													>
														{savingItemId === item.id ? (
															<Loader2 className="mr-1 h-4 w-4 animate-spin" />
														) : (
															<Check className="mr-1 h-4 w-4" />
														)}
														Save
													</Button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Empty state */}
				{experiences.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No work experience added</h3>
							<p className="text-muted-foreground mb-6 max-w-md">
								Add your professional experience to showcase your career history.
							</p>
							<Button onClick={() => startAdding("experience")}>
								<Plus className="mr-2 h-4 w-4" />
								Add Your First Experience
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Experience cards */}
				<div className="space-y-3">
					{experiences.map((experience) => (
						<Card key={experience.id} className="group hover:shadow-md transition-shadow">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<div>
											<h3 className="font-semibold text-lg">{experience.jobTitle}</h3>
											<p className="text-muted-foreground">{experience.company}</p>
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<div className="flex items-center gap-1">
												<Calendar className="h-4 w-4" />
												<span>
													{formatDate(experience.startDate)} -{" "}
													{experience.isCurrent
														? "Present"
														: formatDate(experience.endDate || "")}
												</span>
											</div>
											{experience.location && (
												<div className="flex items-center gap-1">
													<MapPin className="h-4 w-4" />
													<span>{experience.location}</span>
												</div>
											)}
										</div>
										{experience.description && (
											<p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
												{experience.description}
											</p>
										)}
										{experience.technologies && (
											<div className="flex flex-wrap gap-1.5 pt-1">
												{experience.technologies.split(",").map((tech, idx) => (
													<Badge key={idx} variant="secondary" className="text-xs">
														{tech.trim()}
													</Badge>
												))}
											</div>
										)}
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => startEditing("experience", experience.id)}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setDeleteId(experience.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			{/* Edit/Add Sheet */}
			<Sheet open={isEditingExperience} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>
							{editingExperience ? "Edit Work Experience" : "Add Work Experience"}
						</SheetTitle>
						<SheetDescription>
							{editingExperience
								? "Update your work experience details"
								: "Add a new work experience to your profile"}
						</SheetDescription>
					</SheetHeader>
					<ExperienceForm
						experience={editingExperience}
						onSuccess={cancelEditing}
						onCancel={cancelEditing}
					/>
				</SheetContent>
			</Sheet>

			{/* Delete confirmation */}
			<AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete work experience?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete this work experience from your profile.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// Form component for the Sheet
interface ExperienceFormProps {
	experience?: WorkExperienceResponse | null;
	onSuccess: () => void;
	onCancel: () => void;
}

function ExperienceForm({ experience, onSuccess, onCancel }: ExperienceFormProps) {
	const createMutation = useCreateWorkExperience();
	const updateMutation = useUpdateWorkExperience();

	const form = useForm({
		resolver: zodResolver(createWorkExperienceSchema),
		defaultValues: {
			jobTitle: experience?.jobTitle || "",
			company: experience?.company || "",
			location: experience?.location ?? null,
			startDate: experience?.startDate || "",
			endDate: experience?.endDate ?? null,
			isCurrent: experience?.isCurrent ?? false,
			description: experience?.description ?? null,
			technologies: experience?.technologies ?? null,
			displayOrder: experience?.displayOrder ?? 0,
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = form;

	const isCurrent = watch("isCurrent");

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateWorkExperienceRequest;

		if (experience) {
			updateMutation.mutate(
				{ id: experience.id, data: validatedData },
				{
					onSuccess: () => {
						toast.success("Work experience updated successfully!");
						onSuccess();
					},
					onError: (error) => {
						console.error("Error updating work experience:", error);
						toast.error("Error updating work experience. Please try again.");
					},
				}
			);
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => {
					toast.success("Work experience created successfully!");
					onSuccess();
				},
				onError: (error) => {
					console.error("Error creating work experience:", error);
					toast.error("Error creating work experience. Please try again.");
				},
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pt-2">
			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="jobTitle">Job Title *</Label>
						<Input id="jobTitle" {...register("jobTitle")} placeholder="Software Engineer" />
						{errors.jobTitle && (
							<p className="text-red-500 text-sm">{errors.jobTitle.message}</p>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="company">Company *</Label>
						<Input id="company" {...register("company")} placeholder="Tech Corp" />
						{errors.company && (
							<p className="text-red-500 text-sm">{errors.company.message}</p>
						)}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="location">Location</Label>
					<Input id="location" {...register("location")} placeholder="San Francisco, CA" />
					{errors.location && (
						<p className="text-red-500 text-sm">{errors.location.message}</p>
					)}
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="startDate">Start Date *</Label>
						<Input id="startDate" type="month" {...register("startDate")} />
						{errors.startDate && (
							<p className="text-red-500 text-sm">{errors.startDate.message}</p>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="endDate">End Date</Label>
						<Input
							id="endDate"
							type="month"
							{...register("endDate")}
							disabled={isCurrent}
						/>
						{errors.endDate && (
							<p className="text-red-500 text-sm">{errors.endDate.message}</p>
						)}
					</div>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						id="isCurrent"
						checked={isCurrent}
						onCheckedChange={(checked) => {
							setValue("isCurrent", checked === true);
							if (checked) {
								setValue("endDate", null);
							}
						}}
					/>
					<Label htmlFor="isCurrent" className="cursor-pointer">
						I currently work here
					</Label>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="description">Description</Label>
					<Textarea
						id="description"
						{...register("description")}
						placeholder="Describe your responsibilities and achievements..."
						rows={4}
					/>
					{errors.description && (
						<p className="text-red-500 text-sm">{errors.description.message}</p>
					)}
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="technologies">Technologies</Label>
					<Input
						id="technologies"
						{...register("technologies")}
						placeholder="React, Node.js, Python, AWS"
					/>
					<p className="text-xs text-muted-foreground">Separate with commas</p>
					{errors.technologies && (
						<p className="text-red-500 text-sm">{errors.technologies.message}</p>
					)}
				</div>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					<Save className="mr-2 h-4 w-4" />
					{isSubmitting
						? "Saving..."
						: experience
							? "Update Experience"
							: "Add Experience"}
				</Button>
			</div>
		</form>
	);
}

// Inline form for editing pending items
interface PendingEditFormProps {
	initialValues: CreateWorkExperienceRequest;
	onSave: (data: CreateWorkExperienceRequest) => void;
	onCancel: () => void;
}

function PendingEditForm({ initialValues, onSave, onCancel }: PendingEditFormProps) {
	const form = useForm({
		resolver: zodResolver(createWorkExperienceSchema),
		defaultValues: initialValues,
	});

	const { register, handleSubmit, formState: { errors } } = form;

	const onSubmit = (data: unknown) => {
		onSave(data as CreateWorkExperienceRequest);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="pendingJobTitle" className="text-xs">Job Title</Label>
					<Input id="pendingJobTitle" {...register("jobTitle")} className="h-8" />
					{errors.jobTitle && (
						<p className="text-red-500 text-xs">{errors.jobTitle.message}</p>
					)}
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="pendingCompany" className="text-xs">Company</Label>
					<Input id="pendingCompany" {...register("company")} className="h-8" />
					{errors.company && (
						<p className="text-red-500 text-xs">{errors.company.message}</p>
					)}
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" size="sm">
					Update Draft
				</Button>
			</div>
		</form>
	);
}
