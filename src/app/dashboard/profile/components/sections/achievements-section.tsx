"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Trophy, Calendar, Save, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { useUpdateAchievement } from "@/app/dashboard/profile/mutations/use-update-achievement";
import { useDeleteAchievement } from "@/app/dashboard/profile/mutations/use-delete-achievement";
import { createAchievementSchema } from "@/app/api/profile/validators";
import type { AchievementResponse, CreateAchievementRequest } from "@/app/api/profile/validators";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

interface AchievementsSectionProps {
	achievements: AchievementResponse[];
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
	const editingAchievement = isEditingAchievement && editingState?.itemId ? achievements.find((a) => a.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "achievements") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => { toast.success("Achievement deleted!"); closeDeleteConfirmation(); },
			onError: () => toast.error("Error deleting achievement."),
		});
	};

	const handleSavePending = async (id: string, data: CreateAchievementRequest) => {
		setSavingItemId(id);
		try { await createMutation.mutateAsync(data); removePendingItem(id); toast.success("Achievement saved!"); }
		catch { toast.error("Failed to save achievement."); }
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
						<h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6" />Achievements</h1>
						<p className="text-muted-foreground">Your awards and accomplishments</p>
					</div>
					<Button onClick={() => startAdding("achievements")}><Plus className="mr-2 h-4 w-4" />Add Achievement</Button>
				</div>

				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6 space-y-3">
							<p className="text-sm font-semibold text-primary">{pendingItems.length} pending achievement{pendingItems.length !== 1 ? "s" : ""}</p>
							{pendingItems.map((item) => (
								<div key={item.id} className="flex items-center justify-between rounded-md border border-primary/20 bg-background p-3">
									<div><p className="font-medium">{item.request.title}</p></div>
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

				{achievements.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Trophy className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No achievements added</h3>
							<p className="text-muted-foreground mb-6">Add your awards and accomplishments.</p>
							<Button onClick={() => startAdding("achievements")}><Plus className="mr-2 h-4 w-4" />Add Achievement</Button>
						</CardContent>
					</Card>
				)}

				<div className="space-y-3">
					{achievements.map((achievement) => (
						<Card key={achievement.id} className="group hover:shadow-md transition-shadow">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<h3 className="font-semibold text-lg">{achievement.title}</h3>
										{achievement.organization && <p className="text-muted-foreground">{achievement.organization}</p>}
										{achievement.description && <p className="text-sm text-muted-foreground line-clamp-2">{achievement.description}</p>}
										{achievement.date && <div className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /><span>{formatDate(achievement.date)}</span></div>}
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
										<Button variant="ghost" size="icon" onClick={() => startEditing("achievements", achievement.id)}><Edit className="h-4 w-4" /></Button>
										<Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation("achievements", achievement.id)}><Trash2 className="h-4 w-4" /></Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			<Sheet open={isEditingAchievement} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader><SheetTitle>{editingAchievement ? "Edit Achievement" : "Add Achievement"}</SheetTitle><SheetDescription>{editingAchievement ? "Update achievement details" : "Add a new achievement"}</SheetDescription></SheetHeader>
					<AchievementForm achievement={editingAchievement} onSuccess={cancelEditing} onCancel={cancelEditing} />
				</SheetContent>
			</Sheet>

			<AlertDialog open={deleteConfirmation?.section === "achievements"} onOpenChange={(open) => !open && closeDeleteConfirmation()}>
				<AlertDialogContent>
					<AlertDialogHeader><AlertDialogTitle>Delete achievement?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
					<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function AchievementForm({ achievement, onSuccess, onCancel }: { achievement?: AchievementResponse | null; onSuccess: () => void; onCancel: () => void }) {
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

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateAchievementRequest;
		if (achievement) {
			updateMutation.mutate({ id: achievement.id, data: validatedData }, {
				onSuccess: () => { toast.success("Achievement updated!"); onSuccess(); },
				onError: () => toast.error("Error updating achievement."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Achievement added!"); onSuccess(); },
				onError: () => toast.error("Error adding achievement."),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2"><Label htmlFor="title">Title *</Label><Input id="title" {...register("title")} placeholder="Best Innovation Award" />{errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}</div>
			<div className="flex flex-col gap-2"><Label htmlFor="organization">Organization</Label><Input id="organization" {...register("organization")} placeholder="Company or Institution" /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="date">Date</Label><Input id="date" type="month" {...register("date")} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" {...register("description")} placeholder="Describe your achievement..." rows={3} /></div>
			<div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4" />{isSubmitting ? "Saving..." : achievement ? "Update" : "Add"}</Button></div>
		</form>
	);
}
