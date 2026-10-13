"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";
import { useUpdateReference } from "@/app/dashboard/profile/mutations/use-update-reference";
import { useDeleteReference } from "@/app/dashboard/profile/mutations/use-delete-reference";
import { createReferenceSchema } from "@/app/api/profile/validators";
import type { ReferenceJsonResponse, CreateReferenceRequest } from "@/app/api/profile/validators";
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

interface ReferencesSectionProps {
	references: ReferenceJsonResponse[];
	isLoading: boolean;
}

export function ReferencesSection({ references, isLoading }: ReferencesSectionProps) {
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
	const pendingItems = useImportReviewStore((state) => state.references);
	const removePendingItem = useImportReviewStore((state) => state.removeReferenceDraft);
	const createMutation = useCreateReference();
	const deleteMutation = useDeleteReference();

	const isEditingReference = isSheetOpen && editingState?.section === "references";
	const editingReference = isEditingReference && editingState.itemId ? references.find((r) => r.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "references") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => { toast.success("Reference deleted"); closeDeleteConfirmation(); },
			onError: () => toast.error("Couldn't delete the reference. Try again."),
		});
	};

	const handleSavePending = async (id: string, data: CreateReferenceRequest) => {
		setSavingItemId(id);
		try { await createMutation.mutateAsync(data); removePendingItem(id); toast.success("Reference saved"); }
		catch { toast.error("Couldn't save the reference. Try again."); }
		finally { setSavingItemId(null); }
	};

	if (isLoading) return <ProfileItemSkeleton />;

	// An empty section offers its one action in the empty state instead.
	const isEmpty = references.length === 0 && pendingItems.length === 0;

	const addButton = (
		<AddButton onClick={() => startAdding("references")}>Add reference</AddButton>
	);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="References"
					description="People who have agreed to vouch for your work."
					action={isEmpty ? undefined : addButton}
				/>

				{pendingItems.length > 0 && (
					<PendingPanel count={pendingItems.length} singular="reference" plural="references">
						{pendingItems.map((item) => (
							<PendingRow
								key={item.id}
								name={item.request.name}
								isSaving={savingItemId === item.id}
								onDiscard={() => removePendingItem(item.id)}
								onSave={withAsyncHandler(() => handleSavePending(item.id, item.request))}
							>
								<ReferenceSummary reference={item.request} pending />
							</PendingRow>
						))}
					</PendingPanel>
				)}

				{isEmpty && (
					<SectionEmpty title="No references yet" action={addButton}>
						Add someone a hiring team can contact about you.
					</SectionEmpty>
				)}

				{references.length > 0 && (
					<EntryPanel>
						{references.map((reference) => (
							<EntryRow
								key={reference.id}
								name={reference.name}
								onEdit={() => startEditing("references", reference.id)}
								onDelete={() => openDeleteConfirmation("references", reference.id)}
							>
								<ReferenceSummary reference={reference} />
							</EntryRow>
						))}
					</EntryPanel>
				)}
			</div>

			<EntrySheet
				open={isEditingReference}
				onClose={cancelEditing}
				title={editingReference ? "Edit reference" : "Add reference"}
				description="Kept with your profile for when an employer asks."
			>
				<ReferenceForm reference={editingReference} onSuccess={cancelEditing} onCancel={cancelEditing} />
			</EntrySheet>

			<DeleteEntryDialog
				open={deleteConfirmation?.section === "references"}
				onClose={closeDeleteConfirmation}
				onConfirm={handleDelete}
				title="Delete this reference?"
			/>
		</>
	);
}

function ReferenceSummary({
	reference,
	pending = false,
}: {
	reference: CreateReferenceRequest;
	/** Pending rows sit under the panel heading. */
	pending?: boolean;
}) {
	const Heading = pending ? "h4" : "h3";

	return (
		<>
			<div>
				<Heading className="font-semibold">{reference.name}</Heading>
				{(reference.title || reference.company) && (
					<p className="text-muted-foreground">
						{[reference.title, reference.company].filter(Boolean).join(", ")}
					</p>
				)}
			</div>
			<EntryMeta>
				{reference.email && <span>{reference.email}</span>}
				{reference.phone && <span>{reference.phone}</span>}
				{reference.relationship && <span>{reference.relationship}</span>}
			</EntryMeta>
		</>
	);
}

function ReferenceForm({ reference, onSuccess, onCancel }: { reference?: ReferenceJsonResponse | null; onSuccess: () => void; onCancel: () => void }) {
	const createMutation = useCreateReference();
	const updateMutation = useUpdateReference();
	const form = useForm({
		resolver: zodResolver(createReferenceSchema),
		defaultValues: {
			name: reference?.name || "",
			title: reference?.title ?? null,
			company: reference?.company ?? null,
			email: reference?.email ?? null,
			phone: reference?.phone ?? null,
			relationship: reference?.relationship ?? null,
			displayOrder: reference?.displayOrder ?? 0,
		},
	});
	const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

	const onSubmit = (data: unknown) => {
		const validatedData = data as CreateReferenceRequest;
		if (reference) {
			updateMutation.mutate({ id: reference.id, data: validatedData }, {
				onSuccess: () => { toast.success("Changes saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the changes. Try again."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Reference saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the reference. Try again."),
			});
		}
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2"><Label htmlFor="name">Name *</Label><Input id="name" {...register("name")} /><FormFieldError message={errors.name?.message} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="title">Job title</Label><Input id="title" {...register("title")} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="company">Company</Label><Input id="company" {...register("company")} /></div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register("email")} /></div>
				<div className="flex flex-col gap-2"><Label htmlFor="phone">Phone</Label><Input id="phone" {...register("phone")} /></div>
			</div>
			<div className="flex flex-col gap-2"><Label htmlFor="relationship">Relationship</Label><Input id="relationship" {...register("relationship")} placeholder="e.g. former manager" /></div>
			<FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
		</form>
	);
}
