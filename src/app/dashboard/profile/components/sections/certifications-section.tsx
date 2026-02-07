"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Award, Calendar, ExternalLink, Save, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { useUpdateCertification } from "@/app/dashboard/profile/mutations/use-update-certification";
import { useDeleteCertification } from "@/app/dashboard/profile/mutations/use-delete-certification";
import { createCertificationSchema } from "@/app/api/profile/validators";
import type { CertificationResponse, CreateCertificationRequest } from "@/app/api/profile/validators";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

interface CertificationsSectionProps {
	certifications: CertificationResponse[];
	isLoading: boolean;
}

export function CertificationsSection({ certifications, isLoading }: CertificationsSectionProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const editingState = useProfileUIStore((state) => state.editingState);
	const isSheetOpen = useProfileUIStore((state) => state.isSheetOpen);
	const startAdding = useProfileUIStore((state) => state.startAdding);
	const startEditing = useProfileUIStore((state) => state.startEditing);
	const cancelEditing = useProfileUIStore((state) => state.cancelEditing);
	const savingItemId = useProfileUIStore((state) => state.savingItemId);
	const setSavingItemId = useProfileUIStore((state) => state.setSavingItemId);
	const pendingItems = useImportReviewStore((state) => state.certifications);
	const removePendingItem = useImportReviewStore((state) => state.removeCertificationDraft);
	const createMutation = useCreateCertification();
	const deleteMutation = useDeleteCertification();

	const isEditingCert = isSheetOpen && editingState?.section === "certifications";
	const editingCert = isEditingCert && editingState?.itemId ? certifications.find((c) => c.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (deleteId === null) return;
		deleteMutation.mutate(deleteId, {
			onSuccess: () => { toast.success("Certification deleted!"); setDeleteId(null); },
			onError: () => toast.error("Error deleting certification."),
		});
	};

	const handleSavePending = async (id: string, data: CreateCertificationRequest) => {
		setSavingItemId(id);
		try { await createMutation.mutateAsync(data); removePendingItem(id); toast.success("Certification saved!"); }
		catch { toast.error("Failed to save certification."); }
		finally { setSavingItemId(null); }
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "";
		const [year, month] = dateString.split("-");
		const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return `${months[parseInt(month) - 1]} ${year}`;
	};

	if (isLoading) return <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <ProfileItemSkeleton key={i} />)}</div>;

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6" />Certifications</h1>
						<p className="text-muted-foreground">Your professional certifications</p>
					</div>
					<Button onClick={() => startAdding("certifications")}><Plus className="mr-2 h-4 w-4" />Add Certification</Button>
				</div>

				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6 space-y-3">
							<p className="text-sm font-semibold text-primary">{pendingItems.length} pending certification{pendingItems.length !== 1 ? "s" : ""}</p>
							{pendingItems.map((item) => (
								<div key={item.id} className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
									<div><p className="font-medium">{item.request.name}</p><p className="text-sm text-muted-foreground">{item.request.issuingOrganization}</p></div>
									<div className="flex gap-2">
										<Button variant="ghost" size="sm" onClick={() => removePendingItem(item.id)} disabled={savingItemId === item.id}><X className="h-4 w-4" /></Button>
										<Button size="sm" onClick={() => handleSavePending(item.id, item.request)} disabled={savingItemId === item.id}>
											{savingItemId === item.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Save
										</Button>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{certifications.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Award className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No certifications added</h3>
							<p className="text-muted-foreground mb-6">Add your professional certifications.</p>
							<Button onClick={() => startAdding("certifications")}><Plus className="mr-2 h-4 w-4" />Add Certification</Button>
						</CardContent>
					</Card>
				)}

				<div className="space-y-3">
					{certifications.map((cert) => (
						<Card key={cert.id} className="group hover:shadow-md transition-shadow">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<h3 className="font-semibold text-lg">{cert.name}</h3>
										<p className="text-muted-foreground">{cert.issuingOrganization}</p>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											{cert.issueDate && <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Issued {formatDate(cert.issueDate)}</span></div>}
											{cert.expirationDate && <span>Expires {formatDate(cert.expirationDate)}</span>}
											{cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground"><ExternalLink className="h-4 w-4" />Verify</a>}
										</div>
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
										<Button variant="ghost" size="icon" onClick={() => startEditing("certifications", cert.id)}><Edit className="h-4 w-4" /></Button>
										<Button variant="ghost" size="icon" onClick={() => setDeleteId(cert.id)}><Trash2 className="h-4 w-4" /></Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			<Sheet open={isEditingCert} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader><SheetTitle>{editingCert ? "Edit Certification" : "Add Certification"}</SheetTitle><SheetDescription>{editingCert ? "Update certification details" : "Add a new certification"}</SheetDescription></SheetHeader>
					<CertificationForm certification={editingCert} onSuccess={cancelEditing} onCancel={cancelEditing} />
				</SheetContent>
			</Sheet>

			<AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader><AlertDialogTitle>Delete certification?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
					<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function CertificationForm({ certification, onSuccess, onCancel }: { certification?: CertificationResponse | null; onSuccess: () => void; onCancel: () => void }) {
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

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateCertificationRequest;
		if (certification) {
			updateMutation.mutate({ id: certification.id, data: validatedData }, {
				onSuccess: () => { toast.success("Certification updated!"); onSuccess(); },
				onError: () => toast.error("Error updating certification."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Certification added!"); onSuccess(); },
				onError: () => toast.error("Error adding certification."),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 mt-6">
			<div className="flex flex-col gap-2"><Label htmlFor="name">Certification Name *</Label><Input id="name" {...register("name")} placeholder="AWS Solutions Architect" />{errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}</div>
			<div className="flex flex-col gap-2"><Label htmlFor="issuingOrganization">Issuing Organization *</Label><Input id="issuingOrganization" {...register("issuingOrganization")} placeholder="Amazon Web Services" />{errors.issuingOrganization && <p className="text-red-500 text-sm">{errors.issuingOrganization.message}</p>}</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2"><Label htmlFor="issueDate">Issue Date</Label><Input id="issueDate" type="month" {...register("issueDate")} /></div>
				<div className="flex flex-col gap-2"><Label htmlFor="expirationDate">Expiration Date</Label><Input id="expirationDate" type="month" {...register("expirationDate")} /></div>
			</div>
			<div className="flex flex-col gap-2"><Label htmlFor="credentialId">Credential ID</Label><Input id="credentialId" {...register("credentialId")} placeholder="ABC123XYZ" /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="credentialUrl">Credential URL</Label><Input id="credentialUrl" type="url" {...register("credentialUrl")} placeholder="https://verify.example.com/cert/123" /></div>
			<div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4" />{isSubmitting ? "Saving..." : certification ? "Update" : "Add"}</Button></div>
		</form>
	);
}
