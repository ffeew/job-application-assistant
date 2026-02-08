"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { Plus, Code, Save, Loader2, Check, X, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { useUpdateSkill } from "@/app/dashboard/profile/mutations/use-update-skill";
import { useDeleteSkill } from "@/app/dashboard/profile/mutations/use-delete-skill";
import { createSkillSchema } from "@/app/api/profile/validators";
import type { SkillResponse, CreateSkillRequest } from "@/app/api/profile/validators";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

const skillCategories = [
	{ value: "technical", label: "Technical" },
	{ value: "soft", label: "Soft Skills" },
	{ value: "language", label: "Languages" },
	{ value: "tool", label: "Tools" },
	{ value: "framework", label: "Frameworks" },
	{ value: "other", label: "Other" },
];

const proficiencyLevels = [
	{ value: "beginner", label: "Beginner" },
	{ value: "intermediate", label: "Intermediate" },
	{ value: "advanced", label: "Advanced" },
	{ value: "expert", label: "Expert" },
];

interface SkillsSectionProps {
	skills: SkillResponse[];
	isLoading: boolean;
}

export function SkillsSection({ skills, isLoading }: SkillsSectionProps) {
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

	const pendingItems = useImportReviewStore((state) => state.skills);
	const removePendingItem = useImportReviewStore((state) => state.removeSkillDraft);

	const createMutation = useCreateSkill();
	const deleteMutation = useDeleteSkill();

	const isEditingSkill = isSheetOpen && editingState?.section === "skills";
	const editingSkill = isEditingSkill && editingState?.itemId
		? skills.find((s) => s.id === editingState.itemId)
		: null;

	// Group skills by category
	const skillsByCategory = useMemo(() => {
		const grouped: Record<string, SkillResponse[]> = {};
		skills.forEach((skill) => {
			const category = skill.category || "other";
			if (!grouped[category]) grouped[category] = [];
			grouped[category].push(skill);
		});
		return grouped;
	}, [skills]);

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "skills") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => {
				toast.success("Skill deleted!");
				closeDeleteConfirmation();
			},
			onError: () => toast.error("Error deleting skill."),
		});
	};

	const handleSavePending = async (id: string, data: CreateSkillRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Skill saved!");
		} catch {
			toast.error("Failed to save skill.");
		} finally {
			setSavingItemId(null);
		}
	};

	if (isLoading) {
		return <ProfileItemSkeleton />;
	}

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<Code className="h-6 w-6" />
							Skills
						</h1>
						<p className="text-muted-foreground">Your technical and professional skills</p>
					</div>
					<Button onClick={() => startAdding("skills")}>
						<Plus className="mr-2 h-4 w-4" />
						Add Skill
					</Button>
				</div>

				{/* Pending imports */}
				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6">
							<p className="text-sm font-semibold text-primary mb-3">
								{pendingItems.length} pending skill{pendingItems.length !== 1 ? "s" : ""} from import
							</p>
							<div className="flex flex-wrap gap-2">
								{pendingItems.map((item) => (
									<div key={item.id} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-3 py-1">
										<span className="text-sm">{item.request.name}</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-5 w-5"
											onClick={() => removePendingItem(item.id)}
											disabled={savingItemId === item.id}
										>
											<X className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-5 w-5"
											onClick={() => handleSavePending(item.id, item.request)}
											disabled={savingItemId === item.id}
										>
											{savingItemId === item.id ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : (
												<Check className="h-3 w-3" />
											)}
										</Button>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Empty state */}
				{skills.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<Code className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No skills added</h3>
							<p className="text-muted-foreground mb-6">Add your skills to showcase your expertise.</p>
							<Button onClick={() => startAdding("skills")}>
								<Plus className="mr-2 h-4 w-4" />
								Add Skill
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Skills grouped by category */}
				{Object.keys(skillsByCategory).length > 0 && (
					<div className="space-y-6">
						{Object.entries(skillsByCategory).map(([category, categorySkills]) => {
							const categoryLabel = skillCategories.find((c) => c.value === category)?.label || category;
							return (
								<div key={category}>
									<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
										{categoryLabel}
									</h3>
									<div className="flex flex-wrap gap-2">
										{categorySkills.map((skill) => (
											<div
												key={skill.id}
												className="group relative inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 hover:border-primary/50 transition-colors"
											>
												<span className="font-medium">{skill.name}</span>
												{skill.proficiencyLevel && (
													<Badge variant="secondary" className="text-xs">
														{skill.proficiencyLevel}
													</Badge>
												)}
												{skill.yearsOfExperience && (
													<span className="text-xs text-muted-foreground">
														{skill.yearsOfExperience}y
													</span>
												)}
												<div className="hidden group-hover:flex items-center gap-1 ml-1">
													<Button
														variant="ghost"
														size="icon"
														className="h-6 w-6"
														onClick={() => startEditing("skills", skill.id)}
													>
														<Edit className="h-3 w-3" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-6 w-6"
														onClick={() => openDeleteConfirmation("skills", skill.id)}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</div>
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Edit/Add Sheet */}
			<Sheet open={isEditingSkill} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{editingSkill ? "Edit Skill" : "Add Skill"}</SheetTitle>
						<SheetDescription>
							{editingSkill ? "Update skill details" : "Add a new skill"}
						</SheetDescription>
					</SheetHeader>
					<SkillForm skill={editingSkill} onSuccess={cancelEditing} onCancel={cancelEditing} />
				</SheetContent>
			</Sheet>

			{/* Delete confirmation */}
			<AlertDialog open={deleteConfirmation?.section === "skills"} onOpenChange={(open) => !open && closeDeleteConfirmation()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete skill?</AlertDialogTitle>
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

function SkillForm({ skill, onSuccess, onCancel }: { skill?: SkillResponse | null; onSuccess: () => void; onCancel: () => void }) {
	const createMutation = useCreateSkill();
	const updateMutation = useUpdateSkill();

	const form = useForm({
		resolver: zodResolver(createSkillSchema),
		defaultValues: {
			name: skill?.name || "",
			category: skill?.category || "technical",
			proficiencyLevel: skill?.proficiencyLevel ?? null,
			yearsOfExperience: skill?.yearsOfExperience ?? null,
			displayOrder: skill?.displayOrder ?? 0,
		},
	});

	const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;
	const category = watch("category");
	const proficiencyLevel = watch("proficiencyLevel");

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateSkillRequest;
		if (skill) {
			updateMutation.mutate({ id: skill.id, data: validatedData }, {
				onSuccess: () => { toast.success("Skill updated!"); onSuccess(); },
				onError: () => toast.error("Error updating skill."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Skill added!"); onSuccess(); },
				onError: () => toast.error("Error adding skill."),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2">
				<Label htmlFor="name">Skill Name *</Label>
				<Input id="name" {...register("name")} placeholder="React" />
				{errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="category">Category *</Label>
				<Select value={category} onValueChange={(value) => setValue("category", value as "technical" | "soft" | "language" | "tool" | "framework" | "other")}>
					<SelectTrigger>
						<SelectValue placeholder="Select category" />
					</SelectTrigger>
					<SelectContent>
						{skillCategories.map((cat) => (
							<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="proficiencyLevel">Proficiency Level</Label>
				<Select value={proficiencyLevel || ""} onValueChange={(value) => setValue("proficiencyLevel", (value || null) as "beginner" | "intermediate" | "advanced" | "expert" | null)}>
					<SelectTrigger>
						<SelectValue placeholder="Select level" />
					</SelectTrigger>
					<SelectContent>
						{proficiencyLevels.map((level) => (
							<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="yearsOfExperience">Years of Experience</Label>
				<Input
					id="yearsOfExperience"
					type="number"
					min="0"
					{...register("yearsOfExperience", { valueAsNumber: true })}
					placeholder="3"
				/>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
				<Button type="submit" disabled={isSubmitting}>
					<Save className="mr-2 h-4 w-4" />
					{isSubmitting ? "Saving..." : skill ? "Update" : "Add"}
				</Button>
			</div>
		</form>
	);
}
