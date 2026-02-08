"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Users, Mail, Phone, Building, Save, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";
import { useUpdateReference } from "@/app/dashboard/profile/mutations/use-update-reference";
import { useDeleteReference } from "@/app/dashboard/profile/mutations/use-delete-reference";
import { createReferenceSchema } from "@/app/api/profile/validators";
import type { ReferenceResponse, CreateReferenceRequest } from "@/app/api/profile/validators";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

interface ReferencesSectionProps {
	references: ReferenceResponse[];
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
	const editingReference = isEditingReference && editingState?.itemId ? references.find((r) => r.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "references") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => { toast.success("Reference deleted!"); closeDeleteConfirmation(); },
			onError: () => toast.error("Error deleting reference."),
		});
	};

	const handleSavePending = async (id: string, data: CreateReferenceRequest) => {
		setSavingItemId(id);
		try { await createMutation.mutateAsync(data); removePendingItem(id); toast.success("Reference saved!"); }
		catch { toast.error("Failed to save reference."); }
		finally { setSavingItemId(null); }
	};

	if (isLoading) return <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <ProfileItemSkeleton key={i} />)}</div>;

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />References</h1>
						<p className="text-muted-foreground">Your professional references</p>
					</div>
					<Button onClick={() => startAdding("references")}><Plus className="mr-2 h-4 w-4" />Add Reference</Button>
				</div>

				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6 space-y-3">
							<p className="text-sm font-semibold text-primary">{pendingItems.length} pending reference{pendingItems.length !== 1 ? "s" : ""}</p>
							{pendingItems.map((item) => (
								<div key={item.id} className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
									<div><p className="font-medium">{item.request.name}</p><p className="text-sm text-muted-foreground">{item.request.company}</p></div>
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

				{references.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Users className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No references added</h3>
							<p className="text-muted-foreground mb-6">Add your professional references.</p>
							<Button onClick={() => startAdding("references")}><Plus className="mr-2 h-4 w-4" />Add Reference</Button>
						</CardContent>
					</Card>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{references.map((reference) => (
						<Card key={reference.id} className="group hover:shadow-md transition-shadow">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<h3 className="font-semibold">{reference.name}</h3>
										{reference.title && <p className="text-sm text-muted-foreground">{reference.title}</p>}
										<div className="space-y-1 text-sm text-muted-foreground">
											{reference.company && <div className="flex items-center gap-1"><Building className="h-3 w-3" />{reference.company}</div>}
											{reference.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{reference.email}</div>}
											{reference.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{reference.phone}</div>}
										</div>
										{reference.relationship && <p className="text-xs text-muted-foreground italic">{reference.relationship}</p>}
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
										<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing("references", reference.id)}><Edit className="h-4 w-4" /></Button>
										<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteConfirmation("references", reference.id)}><Trash2 className="h-4 w-4" /></Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			<Sheet open={isEditingReference} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader><SheetTitle>{editingReference ? "Edit Reference" : "Add Reference"}</SheetTitle><SheetDescription>{editingReference ? "Update reference details" : "Add a new reference"}</SheetDescription></SheetHeader>
					<ReferenceForm reference={editingReference} onSuccess={cancelEditing} onCancel={cancelEditing} />
				</SheetContent>
			</Sheet>

			<AlertDialog open={deleteConfirmation?.section === "references"} onOpenChange={(open) => !open && closeDeleteConfirmation()}>
				<AlertDialogContent>
					<AlertDialogHeader><AlertDialogTitle>Delete reference?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
					<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function ReferenceForm({ reference, onSuccess, onCancel }: { reference?: ReferenceResponse | null; onSuccess: () => void; onCancel: () => void }) {
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

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateReferenceRequest;
		if (reference) {
			updateMutation.mutate({ id: reference.id, data: validatedData }, {
				onSuccess: () => { toast.success("Reference updated!"); onSuccess(); },
				onError: () => toast.error("Error updating reference."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Reference added!"); onSuccess(); },
				onError: () => toast.error("Error adding reference."),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2"><Label htmlFor="name">Name *</Label><Input id="name" {...register("name")} placeholder="John Smith" /><FormFieldError message={errors.name?.message} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="title">Title</Label><Input id="title" {...register("title")} placeholder="Senior Manager" /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="company">Company</Label><Input id="company" {...register("company")} placeholder="Tech Corp" /></div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register("email")} placeholder="john@example.com" /></div>
				<div className="flex flex-col gap-2"><Label htmlFor="phone">Phone</Label><Input id="phone" {...register("phone")} placeholder="+1 (555) 123-4567" /></div>
			</div>
			<div className="flex flex-col gap-2"><Label htmlFor="relationship">Relationship</Label><Input id="relationship" {...register("relationship")} placeholder="Former Manager" /></div>
			<div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4" />{isSubmitting ? "Saving..." : reference ? "Update" : "Add"}</Button></div>
		</form>
	);
}
