"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { useUpdateSkill } from "@/app/dashboard/profile/mutations/use-update-skill";
import { useDeleteSkill } from "@/app/dashboard/profile/mutations/use-delete-skill";
import { createSkillSchema } from "@/app/api/profile/validators";
import type { SkillJsonResponse, CreateSkillRequest } from "@/app/api/profile/validators";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";
import {
	AddButton,
	DeleteEntryDialog,
	EntrySheet,
	FormActions,
	PendingPanel,
	SectionEmpty,
	SectionHeader,
} from "../section-parts";

const skillCategories = [
	{ value: "technical", label: "Technical" },
	{ value: "soft", label: "Soft skills" },
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
	skills: SkillJsonResponse[];
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
	const editingSkill = isEditingSkill && editingState.itemId
		? skills.find((s) => s.id === editingState.itemId)
		: null;

	const skillsByCategory = useMemo(() => {
		const grouped: Record<string, SkillJsonResponse[]> = {};
		skills.forEach((skill) => {
			const category = skill.category;
			if (!grouped[category]) grouped[category] = [];
			grouped[category].push(skill);
		});
		return grouped;
	}, [skills]);

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "skills") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => {
				toast.success("Skill deleted");
				closeDeleteConfirmation();
			},
			onError: () => toast.error("Couldn't delete the skill. Try again."),
		});
	};

	const handleSavePending = async (id: string, data: CreateSkillRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Skill saved");
		} catch {
			toast.error("Couldn't save the skill. Try again.");
		} finally {
			setSavingItemId(null);
		}
	};

	if (isLoading) {
		return <ProfileItemSkeleton />;
	}

	// An empty section offers its one action in the empty state instead.
	const isEmpty = skills.length === 0 && pendingItems.length === 0;

	const addButton = (
		<AddButton onClick={() => startAdding("skills")}>Add skill</AddButton>
	);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="Skills"
					description="Grouped by category, as they appear on a resume. Select a skill to edit it."
					action={isEmpty ? undefined : addButton}
				/>

				{pendingItems.length > 0 && (
					<PendingPanel count={pendingItems.length} singular="skill" plural="skills">
						<ul className="flex flex-wrap gap-2">
							{pendingItems.map((item) => (
								<li
									key={item.id}
									className="bg-card flex h-9 items-center gap-0.5 rounded-md border pr-0.5 pl-3"
								>
									<span className="mr-1 text-sm font-medium">{item.request.name}</span>
									<Button
										variant="ghost"
										size="icon-xs"
										aria-label={`Discard ${item.request.name}`}
										onClick={() => removePendingItem(item.id)}
										disabled={savingItemId === item.id}
									>
										<X />
									</Button>
									<Button
										variant="ghost"
										size="icon-xs"
										aria-label={`Save ${item.request.name}`}
										onClick={withAsyncHandler(() => handleSavePending(item.id, item.request))}
										disabled={savingItemId === item.id}
									>
										{savingItemId === item.id ? (
											<Loader2 className="animate-spin" />
										) : (
											<Check />
										)}
									</Button>
								</li>
							))}
						</ul>
					</PendingPanel>
				)}

				{isEmpty && (
					<SectionEmpty title="No skills yet" action={addButton}>
						Add the tools, languages and strengths a listing might ask for.
					</SectionEmpty>
				)}

				{Object.keys(skillsByCategory).length > 0 && (
					<div className="flex flex-col gap-5">
						{Object.entries(skillsByCategory).map(([category, categorySkills]) => {
							const categoryLabel = skillCategories.find((c) => c.value === category)?.label || category;
							return (
								<div key={category} className="flex flex-col gap-2">
									<h3 className="text-sm font-semibold">{categoryLabel}</h3>
									<ul className="flex flex-wrap gap-2">
										{categorySkills.map((skill) => (
											<li
												key={skill.id}
												className="bg-card flex h-9 items-center rounded-md border"
											>
												<button
													type="button"
													aria-label={`Edit ${skill.name}`}
													onClick={() => startEditing("skills", skill.id)}
													className="hover:bg-accent flex h-full items-baseline gap-2 rounded-l-md py-2 pr-2 pl-3 text-sm transition-colors"
												>
													<span className="font-medium">{skill.name}</span>
													{(skill.proficiencyLevel || skill.yearsOfExperience) && (
														<span className="text-muted-foreground">
															{[
																proficiencyLevels.find((level) => level.value === skill.proficiencyLevel)?.label,
																skill.yearsOfExperience ? `${skill.yearsOfExperience} yr` : null,
															]
																.filter(Boolean)
																.join(", ")}
														</span>
													)}
												</button>
												<Button
													variant="ghost"
													size="icon-xs"
													className="text-muted-foreground mr-0.5"
													aria-label={`Delete ${skill.name}`}
													onClick={() => openDeleteConfirmation("skills", skill.id)}
												>
													<X />
												</Button>
											</li>
										))}
									</ul>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<EntrySheet
				open={isEditingSkill}
				onClose={cancelEditing}
				title={editingSkill ? "Edit skill" : "Add skill"}
				description="Appears in the Skills section of your resumes."
			>
				<SkillForm skill={editingSkill} onSuccess={cancelEditing} onCancel={cancelEditing} />
			</EntrySheet>

			<DeleteEntryDialog
				open={deleteConfirmation?.section === "skills"}
				onClose={closeDeleteConfirmation}
				onConfirm={handleDelete}
				title="Delete this skill?"
			/>
		</>
	);
}

function SkillForm({ skill, onSuccess, onCancel }: { skill?: SkillJsonResponse | null; onSuccess: () => void; onCancel: () => void }) {
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

	const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;
	const [category, proficiencyLevel] = useWatch({
		control: form.control,
		name: ["category", "proficiencyLevel"],
	});

	const onSubmit = (data: unknown) => {
		const validatedData = data as CreateSkillRequest;
		if (skill) {
			updateMutation.mutate({ id: skill.id, data: validatedData }, {
				onSuccess: () => { toast.success("Changes saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the changes. Try again."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Skill saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the skill. Try again."),
			});
		}
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2">
				<Label htmlFor="name">Skill name *</Label>
				<Input id="name" {...register("name")} />
				<FormFieldError message={errors.name?.message} />
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="category">Category *</Label>
				<Select value={category} onValueChange={(value) => setValue("category", value as "technical" | "soft" | "language" | "tool" | "framework" | "other")}>
					<SelectTrigger id="category">
						<SelectValue placeholder="Choose a category" />
					</SelectTrigger>
					<SelectContent>
						{skillCategories.map((cat) => (
							<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="proficiencyLevel">Proficiency</Label>
				<Select value={proficiencyLevel || ""} onValueChange={(value) => setValue("proficiencyLevel", (value || null) as "beginner" | "intermediate" | "advanced" | "expert" | null)}>
					<SelectTrigger id="proficiencyLevel">
						<SelectValue placeholder="Choose a level" />
					</SelectTrigger>
					<SelectContent>
						{proficiencyLevels.map((level) => (
							<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="yearsOfExperience">Years of experience</Label>
				<Input
					id="yearsOfExperience"
					type="number"
					min="0"
					{...register("yearsOfExperience", {
						// valueAsNumber turns a cleared field into NaN, which fails validation.
						setValueAs: (value: unknown) =>
							value === "" || value === null || value === undefined
								? null
								: Number(value),
					})}
				/>
				<FormFieldError message={errors.yearsOfExperience?.message} />
			</div>

			<FormActions
				onCancel={onCancel}
				isSubmitting={
					isSubmitting || createMutation.isPending || updateMutation.isPending
				}
			/>
		</form>
	);
}
