"use client";

import { formatMonthYear } from "@/lib/format-month-year";
import { cn } from "@/lib/utils";

import { withAsyncHandler } from "@/lib/async-action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { useUpdateAchievement } from "@/app/dashboard/profile/mutations/use-update-achievement";
import { useDeleteAchievement } from "@/app/dashboard/profile/mutations/use-delete-achievement";
import { createAchievementSchema } from "@/app/api/profile/validators";
import type { AchievementJsonResponse, CreateAchievementRequest } from "@/app/api/profile/validators";
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
} from "../section-parts";

interface AchievementsSectionProps {
	achievements: AchievementJsonResponse[];
	isLoading: boolean;
}

export function AchievementsSection({ achievements, isLoading }: AchievementsSectionProps) {
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
	const pendingItems = useImportReviewStore((state) => state.achievements);
	const removePendingItem = useImportReviewStore((state) => state.removeAchievementDraft);
	const createMutation = useCreateAchievement();
	const deleteMutation = useDeleteAchievement();

	const isEditingAchievement = isSheetOpen && editingState?.section === "achievements";
	const editingAchievement = isEditingAchievement && editingState.itemId ? achievements.find((a) => a.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "achievements") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => { toast.success("Achievement deleted"); closeDeleteConfirmation(); },
			onError: () => toast.error("Couldn't delete the achievement. Try again."),
		});
	};

	const handleSavePending = async (id: string, data: CreateAchievementRequest) => {
		setSavingItemId(id);
		try { await createMutation.mutateAsync(data); removePendingItem(id); toast.success("Achievement saved"); }
		catch { toast.error("Couldn't save the achievement. Try again."); }
		finally { setSavingItemId(null); }
	};

	if (isLoading) return <ProfileItemSkeleton />;

	// An empty section offers its one action in the empty state instead.
	const isEmpty = achievements.length === 0 && pendingItems.length === 0;

	const addButton = (
		<AddButton onClick={() => startAdding("achievements")}>Add achievement</AddButton>
	);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="Achievements"
					description="Awards and recognition that are not tied to one job."
					action={isEmpty ? undefined : addButton}
				/>

				{pendingItems.length > 0 && (
					<PendingPanel count={pendingItems.length} singular="achievement" plural="achievements">
						{pendingItems.map((item) => (
							<PendingRow
								key={item.id}
								name={item.request.title}
								isSaving={savingItemId === item.id}
								onDiscard={() => removePendingItem(item.id)}
								onSave={withAsyncHandler(() => handleSavePending(item.id, item.request))}
							>
								<AchievementSummary achievement={item.request} pending />
							</PendingRow>
						))}
					</PendingPanel>
				)}

				{isEmpty && (
					<SectionEmpty title="No achievements yet" action={addButton}>
						Add awards, publications or anything else you were recognised for.
					</SectionEmpty>
				)}

				{achievements.length > 0 && (
					<EntryPanel>
						{achievements.map((achievement) => (
							<EntryRow
								key={achievement.id}
								name={achievement.title}
								onEdit={() => startEditing("achievements", achievement.id)}
								onDelete={() => openDeleteConfirmation("achievements", achievement.id)}
							>
								<AchievementSummary achievement={achievement} />
							</EntryRow>
						))}
					</EntryPanel>
				)}
			</div>

			<EntrySheet
				open={isEditingAchievement}
				onClose={cancelEditing}
				title={editingAchievement ? "Edit achievement" : "Add achievement"}
				description="Appears in the Achievements section of your resumes."
			>
				<AchievementForm achievement={editingAchievement} onSuccess={cancelEditing} onCancel={cancelEditing} />
			</EntrySheet>

			<DeleteEntryDialog
				open={deleteConfirmation?.section === "achievements"}
				onClose={closeDeleteConfirmation}
				onConfirm={handleDelete}
				title="Delete this achievement?"
			/>
		</>
	);
}

function AchievementSummary({
	achievement,
	pending = false,
}: {
	achievement: CreateAchievementRequest;
	pending?: boolean;
}) {
	const Heading = pending ? "h4" : "h3";

	return (
		<>
			<div>
				<Heading className="font-semibold">{achievement.title}</Heading>
				{achievement.organization && <p className="text-muted-foreground">{achievement.organization}</p>}
			</div>
			{achievement.description && (
				<p className={cn("text-muted-foreground text-sm", pending ? "whitespace-pre-wrap" : "line-clamp-2")}>
					{achievement.description}
				</p>
			)}
			{achievement.date && <EntryMeta><span>{formatMonthYear(achievement.date)}</span></EntryMeta>}
		</>
	);
}

function AchievementForm({ achievement, onSuccess, onCancel }: { achievement?: AchievementJsonResponse | null; onSuccess: () => void; onCancel: () => void }) {
	const createMutation = useCreateAchievement();
	const updateMutation = useUpdateAchievement();
	const form = useForm({
		resolver: zodResolver(createAchievementSchema),
		defaultValues: {
			title: achievement?.title || "",
			organization: achievement?.organization ?? null,
			date: achievement?.date ?? null,
			description: achievement?.description ?? null,
			displayOrder: achievement?.displayOrder ?? 0,
		},
	});
	const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

	const onSubmit = (data: unknown) => {
		const validatedData = data as CreateAchievementRequest;
		if (achievement) {
			updateMutation.mutate({ id: achievement.id, data: validatedData }, {
				onSuccess: () => { toast.success("Changes saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the changes. Try again."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Achievement saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the achievement. Try again."),
			});
		}
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2"><Label htmlFor="title">Title *</Label><Input id="title" {...register("title")} /><FormFieldError message={errors.title?.message} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="organization">Organization</Label><Input id="organization" {...register("organization")} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="date">Date</Label><Input id="date" type="month" {...register("date")} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" {...register("description")} rows={3} /></div>
			<FormActions
				onCancel={onCancel}
				isSubmitting={
					isSubmitting || createMutation.isPending || updateMutation.isPending
				}
			/>
		</form>
	);
}
