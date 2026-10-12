"use client";

import { formatMonthYear } from "@/lib/format-month-year";

import { withAsyncHandler } from "@/lib/async-action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { useUpdateCertification } from "@/app/dashboard/profile/mutations/use-update-certification";
import { useDeleteCertification } from "@/app/dashboard/profile/mutations/use-delete-certification";
import { createCertificationSchema } from "@/app/api/profile/validators";
import type { CertificationJsonResponse, CreateCertificationRequest } from "@/app/api/profile/validators";
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

interface CertificationsSectionProps {
	certifications: CertificationJsonResponse[];
	isLoading: boolean;
}

export function CertificationsSection({ certifications, isLoading }: CertificationsSectionProps) {
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
	const pendingItems = useImportReviewStore((state) => state.certifications);
	const removePendingItem = useImportReviewStore((state) => state.removeCertificationDraft);
	const createMutation = useCreateCertification();
	const deleteMutation = useDeleteCertification();

	const isEditingCert = isSheetOpen && editingState?.section === "certifications";
	const editingCert = isEditingCert && editingState.itemId ? certifications.find((c) => c.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "certifications") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => { toast.success("Certification deleted"); closeDeleteConfirmation(); },
			onError: () => toast.error("Couldn't delete the certification. Try again."),
		});
	};

	const handleSavePending = async (id: string, data: CreateCertificationRequest) => {
		setSavingItemId(id);
		try { await createMutation.mutateAsync(data); removePendingItem(id); toast.success("Certification saved"); }
		catch { toast.error("Couldn't save the certification. Try again."); }
		finally { setSavingItemId(null); }
	};

	const formatDate = formatMonthYear;

	if (isLoading) return <ProfileItemSkeleton />;

	// An empty section offers its one action in the empty state instead.
	const isEmpty = certifications.length === 0 && pendingItems.length === 0;

	const addButton = (
		<AddButton onClick={() => startAdding("certifications")}>Add certification</AddButton>
	);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="Certifications"
					description="Credentials and licences, with who issued them."
					action={isEmpty ? undefined : addButton}
				/>

				{pendingItems.length > 0 && (
					<PendingPanel count={pendingItems.length} singular="certification" plural="certifications">
						{pendingItems.map((item) => (
							<PendingRow
								key={item.id}
								name={item.request.name}
								isSaving={savingItemId === item.id}
								onDiscard={() => removePendingItem(item.id)}
								onSave={withAsyncHandler(() => handleSavePending(item.id, item.request))}
							>
								<p className="font-medium">{item.request.name}</p>
								<p className="text-muted-foreground text-sm">{item.request.issuingOrganization}</p>
							</PendingRow>
						))}
					</PendingPanel>
				)}

				{isEmpty && (
					<SectionEmpty title="No certifications yet" action={addButton}>
						Add any credentials a listing might ask for.
					</SectionEmpty>
				)}

				{certifications.length > 0 && (
					<EntryPanel>
						{certifications.map((cert) => (
							<EntryRow
								key={cert.id}
								name={cert.name}
								onEdit={() => startEditing("certifications", cert.id)}
								onDelete={() => openDeleteConfirmation("certifications", cert.id)}
							>
								<div>
									<h3 className="font-semibold">{cert.name}</h3>
									<p className="text-muted-foreground">{cert.issuingOrganization}</p>
								</div>
								<EntryMeta>
									{cert.issueDate && <span>Issued {formatDate(cert.issueDate)}</span>}
									{cert.expirationDate && <span>Expires {formatDate(cert.expirationDate)}</span>}
									{cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-4 hover:no-underline">Open credential</a>}
								</EntryMeta>
							</EntryRow>
						))}
					</EntryPanel>
				)}
			</div>

			<EntrySheet
				open={isEditingCert}
				onClose={cancelEditing}
				title={editingCert ? "Edit certification" : "Add certification"}
				description="Appears in the Certifications section of your resumes."
			>
				<CertificationForm certification={editingCert} onSuccess={cancelEditing} onCancel={cancelEditing} />
			</EntrySheet>

			<DeleteEntryDialog
				open={deleteConfirmation?.section === "certifications"}
				onClose={closeDeleteConfirmation}
				onConfirm={handleDelete}
				title="Delete this certification?"
			/>
		</>
	);
}

function CertificationForm({ certification, onSuccess, onCancel }: { certification?: CertificationJsonResponse | null; onSuccess: () => void; onCancel: () => void }) {
	const createMutation = useCreateCertification();
	const updateMutation = useUpdateCertification();
	const form = useForm({
		resolver: zodResolver(createCertificationSchema),
		defaultValues: {
			name: certification?.name || "",
			issuingOrganization: certification?.issuingOrganization || "",
			issueDate: certification?.issueDate ?? null,
			expirationDate: certification?.expirationDate ?? null,
			credentialId: certification?.credentialId ?? null,
			credentialUrl: certification?.credentialUrl ?? null,
			displayOrder: certification?.displayOrder ?? 0,
		},
	});
	const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

	const onSubmit = (data: unknown) => {
		const validatedData = data as CreateCertificationRequest;
		if (certification) {
			updateMutation.mutate({ id: certification.id, data: validatedData }, {
				onSuccess: () => { toast.success("Changes saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the changes. Try again."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Certification saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the certification. Try again."),
			});
		}
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2"><Label htmlFor="name">Certification name *</Label><Input id="name" {...register("name")} /><FormFieldError message={errors.name?.message} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="issuingOrganization">Issuing organization *</Label><Input id="issuingOrganization" {...register("issuingOrganization")} /><FormFieldError message={errors.issuingOrganization?.message} /></div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2"><Label htmlFor="issueDate">Issue date</Label><Input id="issueDate" type="month" {...register("issueDate")} /></div>
				<div className="flex flex-col gap-2"><Label htmlFor="expirationDate">Expiry date</Label><Input id="expirationDate" type="month" {...register("expirationDate")} /></div>
			</div>
			<div className="flex flex-col gap-2"><Label htmlFor="credentialId">Credential ID</Label><Input id="credentialId" {...register("credentialId")} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="credentialUrl">Credential URL</Label><Input id="credentialUrl" type="url" {...register("credentialUrl")} placeholder="https://" /></div>
			<FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
		</form>
	);
}
