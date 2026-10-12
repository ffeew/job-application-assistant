"use client";

import { formatMonthYear } from "@/lib/format-month-year";

import { withAsyncHandler } from "@/lib/async-action";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useCreateWorkExperience } from "@/app/dashboard/profile/mutations/use-create-work-experience";
import { useUpdateWorkExperience } from "@/app/dashboard/profile/mutations/use-update-work-experience";
import { useDeleteWorkExperience } from "@/app/dashboard/profile/mutations/use-delete-work-experience";
import { createWorkExperienceSchema } from "@/app/api/profile/validators";
import type {
	WorkExperienceJsonResponse,
	CreateWorkExperienceRequest,
} from "@/app/api/profile/validators";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";
import {
	AddButton,
	DeleteEntryDialog,
	EntryMeta,
	EntryPanel,
	EntryRow,
	EntrySheet,
	FormActions,
	PendingPanel,
	PendingRow,
	SectionEmpty,
	SectionHeader,
	TagList,
} from "../section-parts";

interface ExperienceSectionProps {
	experiences: WorkExperienceJsonResponse[];
	isLoading: boolean;
}

export function ExperienceSection({ experiences, isLoading }: ExperienceSectionProps) {
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
	const deleteConfirmation = useProfileUIStore((state) => state.deleteConfirmation);
	const openDeleteConfirmation = useProfileUIStore((state) => state.openDeleteConfirmation);
	const closeDeleteConfirmation = useProfileUIStore((state) => state.closeDeleteConfirmation);

	const pendingItems = useImportReviewStore((state) => state.workExperiences);
	const updatePendingItem = useImportReviewStore((state) => state.updateWorkExperienceDraft);
	const removePendingItem = useImportReviewStore((state) => state.removeWorkExperienceDraft);

	const createMutation = useCreateWorkExperience();
	const deleteMutation = useDeleteWorkExperience();

	const isEditingExperience =
		isSheetOpen && editingState?.section === "experience";

	const editingExperience = isEditingExperience && editingState.itemId
		? experiences.find((e) => e.id === editingState.itemId)
		: null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "experience") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => {
				toast.success("Work experience deleted");
				closeDeleteConfirmation();
			},
			onError: (error) => {
				console.error("Error deleting work experience:", error);
				toast.error("Couldn't delete the work experience. Try again.");
			},
		});
	};

	const handleSavePending = async (id: string, data: CreateWorkExperienceRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Work experience saved");
		} catch (error) {
			console.error("Failed to save work experience:", error);
			toast.error("Couldn't save the work experience. Try again.");
		} finally {
			setSavingItemId(null);
		}
	};

	const formatDate = formatMonthYear;

	if (isLoading) {
		return <ProfileItemSkeleton />;
	}

	// An empty section offers its one action in the empty state instead.
	const isEmpty = experiences.length === 0 && pendingItems.length === 0;

	const addButton = (
		<AddButton onClick={() => startAdding("experience")}>Add experience</AddButton>
	);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="Work experience"
					description="Every role you might want on a resume. Tailoring picks from these."
					action={isEmpty ? undefined : addButton}
				/>

				{pendingItems.length > 0 && (
					<PendingPanel
						count={pendingItems.length}
						singular="work experience"
						plural="work experiences"
					>
						{pendingItems.map((item) =>
							editingPendingId === item.id ? (
								<div key={item.id} className="bg-card rounded-md border p-3">
									<PendingEditForm
										initialValues={item.request}
										onSave={(data) => {
											updatePendingItem(item.id, data);
											cancelEditingPending();
											toast.success("Draft updated");
										}}
										onCancel={cancelEditingPending}
									/>
								</div>
							) : (
								<PendingRow
									key={item.id}
									name={`${item.request.jobTitle} at ${item.request.company}`}
									isSaving={savingItemId === item.id}
									onEdit={() => startEditingPending(item.id)}
									onDiscard={() => removePendingItem(item.id)}
									onSave={withAsyncHandler(() =>
										handleSavePending(item.id, item.request),
									)}
								>
									<p className="font-medium">
										{item.request.jobTitle} at {item.request.company}
									</p>
									{item.request.location && (
										<p className="text-muted-foreground text-sm">
											{item.request.location}
										</p>
									)}
									{item.warnings.length > 0 && (
										<ul className="text-warning flex list-disc flex-col gap-1 pl-4 text-sm">
											{item.warnings.map((warning, idx) => (
												<li key={idx}>{warning}</li>
											))}
										</ul>
									)}
								</PendingRow>
							),
						)}
					</PendingPanel>
				)}

				{isEmpty && (
					<SectionEmpty title="No work experience yet" action={addButton}>
						Add each role with what you did and achieved. More detail here
						gives tailoring more to choose from.
					</SectionEmpty>
				)}

				{experiences.length > 0 && (
					<EntryPanel>
						{experiences.map((experience) => (
							<EntryRow
								key={experience.id}
								name={`${experience.jobTitle} at ${experience.company}`}
								onEdit={() => startEditing("experience", experience.id)}
								onDelete={() => openDeleteConfirmation("experience", experience.id)}
							>
								<div>
									<h3 className="font-semibold">{experience.jobTitle}</h3>
									<p className="text-muted-foreground">{experience.company}</p>
								</div>
								<EntryMeta>
									<span>
										{formatDate(experience.startDate)} to{" "}
										{experience.isCurrent
											? "present"
											: formatDate(experience.endDate || "")}
									</span>
									{experience.location && <span>{experience.location}</span>}
								</EntryMeta>
								{experience.description && (
									<p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-wrap">
										{experience.description}
									</p>
								)}
								{experience.technologies && (
									<TagList value={experience.technologies} />
								)}
							</EntryRow>
						))}
					</EntryPanel>
				)}
			</div>

			<EntrySheet
				open={isEditingExperience}
				onClose={cancelEditing}
				title={editingExperience ? "Edit work experience" : "Add work experience"}
				description="Appears in the Work Experiences section of your resumes."
			>
				<ExperienceForm
					experience={editingExperience}
					onSuccess={cancelEditing}
					onCancel={cancelEditing}
				/>
			</EntrySheet>

			<DeleteEntryDialog
				open={deleteConfirmation?.section === "experience"}
				onClose={closeDeleteConfirmation}
				onConfirm={handleDelete}
				title="Delete this work experience?"
			/>
		</>
	);
}

interface ExperienceFormProps {
	experience?: WorkExperienceJsonResponse | null;
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
		setValue,
		formState: { errors, isSubmitting },
	} = form;

	const isCurrent = useWatch({ control: form.control, name: "isCurrent" });

	const onSubmit = (data: unknown) => {
		const validatedData = data as CreateWorkExperienceRequest;

		if (experience) {
			updateMutation.mutate(
				{ id: experience.id, data: validatedData },
				{
					onSuccess: () => {
						toast.success("Changes saved");
						onSuccess();
					},
					onError: (error) => {
						console.error("Error updating work experience:", error);
						toast.error("Couldn't save the changes. Try again.");
					},
				}
			);
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => {
					toast.success("Work experience saved");
					onSuccess();
				},
				onError: (error) => {
					console.error("Error creating work experience:", error);
					toast.error("Couldn't save the work experience. Try again.");
				},
			});
		}
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="jobTitle">Job title *</Label>
						<Input id="jobTitle" {...register("jobTitle")} />
						<FormFieldError message={errors.jobTitle?.message} />
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="company">Company *</Label>
						<Input id="company" {...register("company")} />
						<FormFieldError message={errors.company?.message} />
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="location">Location</Label>
					<Input id="location" {...register("location")} />
					<FormFieldError message={errors.location?.message} />
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="startDate">Start date *</Label>
						<Input id="startDate" type="month" {...register("startDate")} />
						<FormFieldError message={errors.startDate?.message} />
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="endDate">End date</Label>
						<Input
							id="endDate"
							type="month"
							{...register("endDate")}
							disabled={isCurrent}
						/>
						<FormFieldError message={errors.endDate?.message} />
					</div>
				</div>

				<div className="flex items-center gap-2">
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
					<Label htmlFor="description">What you did</Label>
					<Textarea
						id="description"
						{...register("description")}
						aria-describedby="description-hint"
						rows={6}
					/>
					<p id="description-hint" className="text-muted-foreground text-sm">
						One achievement per line. Each line becomes a bullet.
					</p>
					<FormFieldError message={errors.description?.message} />
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="technologies">Technologies</Label>
					<Input
						id="technologies"
						{...register("technologies")}
						placeholder="React, Node.js, Python, AWS"
					/>
					<p className="text-muted-foreground text-sm">Separate with commas.</p>
					<FormFieldError message={errors.technologies?.message} />
				</div>
			</div>

			<FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
		</form>
	);
}

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
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1">
					<Label htmlFor="pendingJobTitle">Job title</Label>
					<Input id="pendingJobTitle" {...register("jobTitle")} />
					<FormFieldError message={errors.jobTitle?.message} />
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="pendingCompany">Company</Label>
					<Input id="pendingCompany" {...register("company")} />
					<FormFieldError message={errors.company?.message} />
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" size="sm">
					Update draft
				</Button>
			</div>
		</form>
	);
}
