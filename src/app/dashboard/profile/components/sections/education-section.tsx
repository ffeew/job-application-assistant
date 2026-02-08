"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
	GraduationCap,
	Calendar,
	MapPin,
	Save,
	Loader2,
	Check,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { useUpdateEducation } from "@/app/dashboard/profile/mutations/use-update-education";
import { useDeleteEducation } from "@/app/dashboard/profile/mutations/use-delete-education";
import { createEducationSchema } from "@/app/api/profile/validators";
import type { EducationResponse, CreateEducationRequest } from "@/app/api/profile/validators";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

interface EducationSectionProps {
	education: EducationResponse[];
	isLoading: boolean;
}

export function EducationSection({ education, isLoading }: EducationSectionProps) {
	const editingState = useProfileUIStore((state) => state.editingState);
	const isSheetOpen = useProfileUIStore((state) => state.isSheetOpen);
	const startAdding = useProfileUIStore((state) => state.startAdding);
	const startEditing = useProfileUIStore((state) => state.startEditing);
	const cancelEditing = useProfileUIStore((state) => state.cancelEditing);
	const savingItemId = useProfileUIStore((state) => state.savingItemId);
	const setSavingItemId = useProfileUIStore((state) => state.setSavingItemId);
	const deleteConfirmation = useProfileUIStore((state) => state.deleteConfirmation);
	const openDeleteConfirmation = useProfileUIStore((state) => state.openDeleteConfirmation);
	const closeDeleteConfirmation = useProfileUIStore((state) => state.closeDeleteConfirmation);

	const pendingItems = useImportReviewStore((state) => state.education);
	const removePendingItem = useImportReviewStore((state) => state.removeEducationDraft);

	const createMutation = useCreateEducation();
	const deleteMutation = useDeleteEducation();

	const isEditingEducation = isSheetOpen && editingState?.section === "education";
	const editingEducation = isEditingEducation && editingState?.itemId
		? education.find((e) => e.id === editingState.itemId)
		: null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "education") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => {
				toast.success("Education deleted successfully!");
				closeDeleteConfirmation();
			},
			onError: (error) => {
				console.error("Error deleting education:", error);
				toast.error("Error deleting education. Please try again.");
			},
		});
	};

	const handleSavePending = async (id: string, data: CreateEducationRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Education saved to your profile.");
		} catch (error) {
			console.error("Failed to save education:", error);
			toast.error("Failed to save education. Please try again.");
		} finally {
			setSavingItemId(null);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "";
		const [year, month] = dateString.split("-");
		const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return `${months[parseInt(month) - 1]} ${year}`;
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 2 }).map((_, i) => (
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
							<GraduationCap className="h-6 w-6" />
							Education
						</h1>
						<p className="text-muted-foreground">Your academic background</p>
					</div>
					<Button onClick={() => startAdding("education")}>
						<Plus className="mr-2 h-4 w-4" />
						Add Education
					</Button>
				</div>

				{/* Pending imports */}
				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6 space-y-3">
							<p className="text-sm font-semibold text-primary">
								{pendingItems.length} pending education entr{pendingItems.length !== 1 ? "ies" : "y"} from import
							</p>
							{pendingItems.map((item) => (
								<div key={item.id} className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
									<div>
										<p className="font-medium">{item.request.degree}</p>
										<p className="text-sm text-muted-foreground">{item.request.institution}</p>
									</div>
									<div className="flex gap-2">
										<Button variant="ghost" size="sm" onClick={() => removePendingItem(item.id)} disabled={savingItemId === item.id}>
											<X className="h-4 w-4" />
										</Button>
										<Button size="sm" onClick={() => handleSavePending(item.id, item.request)} disabled={savingItemId === item.id}>
											{savingItemId === item.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
											Save
										</Button>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Empty state */}
				{education.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No education added</h3>
							<p className="text-muted-foreground mb-6">Add your academic background.</p>
							<Button onClick={() => startAdding("education")}>
								<Plus className="mr-2 h-4 w-4" />
								Add Education
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Education cards */}
				<div className="space-y-3">
					{education.map((edu) => (
						<Card key={edu.id} className="group hover:shadow-md transition-shadow">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<div>
											<h3 className="font-semibold text-lg">{edu.degree}</h3>
											{edu.fieldOfStudy && <p className="text-muted-foreground">{edu.fieldOfStudy}</p>}
											<p className="text-muted-foreground">{edu.institution}</p>
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											{(edu.startDate || edu.endDate) && (
												<div className="flex items-center gap-1">
													<Calendar className="h-4 w-4" />
													<span>{formatDate(edu.startDate)} - {formatDate(edu.endDate)}</span>
												</div>
											)}
											{edu.location && (
												<div className="flex items-center gap-1">
													<MapPin className="h-4 w-4" />
													<span>{edu.location}</span>
												</div>
											)}
										</div>
										<div className="flex flex-wrap gap-2">
											{edu.gpa && <Badge variant="secondary">{edu.gpa}</Badge>}
											{edu.honors && <Badge variant="outline">{edu.honors}</Badge>}
										</div>
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
										<Button variant="ghost" size="icon" onClick={() => startEditing("education", edu.id)}>
											<Edit className="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation("education", edu.id)}>
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
			<Sheet open={isEditingEducation} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{editingEducation ? "Edit Education" : "Add Education"}</SheetTitle>
						<SheetDescription>
							{editingEducation ? "Update your education details" : "Add a new education entry"}
						</SheetDescription>
					</SheetHeader>
					<EducationForm education={editingEducation} onSuccess={cancelEditing} onCancel={cancelEditing} />
				</SheetContent>
			</Sheet>

			{/* Delete confirmation */}
			<AlertDialog open={deleteConfirmation?.section === "education"} onOpenChange={(open) => !open && closeDeleteConfirmation()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete education?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

function EducationForm({ education, onSuccess, onCancel }: { education?: EducationResponse | null; onSuccess: () => void; onCancel: () => void }) {
	const createMutation = useCreateEducation();
	const updateMutation = useUpdateEducation();

	const form = useForm({
		resolver: zodResolver(createEducationSchema),
		defaultValues: {
			degree: education?.degree || "",
			fieldOfStudy: education?.fieldOfStudy ?? null,
			institution: education?.institution || "",
			location: education?.location ?? null,
			startDate: education?.startDate ?? null,
			endDate: education?.endDate ?? null,
			gpa: education?.gpa ?? null,
			honors: education?.honors ?? null,
			relevantCoursework: education?.relevantCoursework ?? null,
			displayOrder: education?.displayOrder ?? 0,
		},
	});

	const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateEducationRequest;
		if (education) {
			updateMutation.mutate({ id: education.id, data: validatedData }, {
				onSuccess: () => { toast.success("Education updated!"); onSuccess(); },
				onError: () => toast.error("Error updating education."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Education added!"); onSuccess(); },
				onError: () => toast.error("Error adding education."),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pt-2">
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="degree">Degree *</Label>
					<Input id="degree" {...register("degree")} placeholder="Bachelor of Science" />
					{errors.degree && <p className="text-red-500 text-sm">{errors.degree.message}</p>}
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="fieldOfStudy">Field of Study</Label>
					<Input id="fieldOfStudy" {...register("fieldOfStudy")} placeholder="Computer Science" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="institution">Institution *</Label>
					<Input id="institution" {...register("institution")} placeholder="University" />
					{errors.institution && <p className="text-red-500 text-sm">{errors.institution.message}</p>}
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="location">Location</Label>
					<Input id="location" {...register("location")} placeholder="City, State" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="startDate">Start Date</Label>
					<Input id="startDate" type="month" {...register("startDate")} />
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="endDate">End Date</Label>
					<Input id="endDate" type="month" {...register("endDate")} />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="gpa">GPA</Label>
					<Input id="gpa" {...register("gpa")} placeholder="3.8/4.0" />
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="honors">Honors</Label>
					<Input id="honors" {...register("honors")} placeholder="Magna Cum Laude" />
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="relevantCoursework">Relevant Coursework</Label>
				<Textarea id="relevantCoursework" {...register("relevantCoursework")} placeholder="Data Structures, Algorithms..." rows={2} />
			</div>
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
				<Button type="submit" disabled={isSubmitting}>
					<Save className="mr-2 h-4 w-4" />
					{isSubmitting ? "Saving..." : education ? "Update" : "Add"}
				</Button>
			</div>
		</form>
	);
}
