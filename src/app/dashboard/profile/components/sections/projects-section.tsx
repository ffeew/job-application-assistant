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
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { useUpdateProject } from "@/app/dashboard/profile/mutations/use-update-project";
import { useDeleteProject } from "@/app/dashboard/profile/mutations/use-delete-project";
import { createProjectSchema } from "@/app/api/profile/validators";
import type { ProjectJsonResponse, CreateProjectRequest } from "@/app/api/profile/validators";
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

interface ProjectsSectionProps {
	projects: ProjectJsonResponse[];
	isLoading: boolean;
}

export function ProjectsSection({ projects, isLoading }: ProjectsSectionProps) {
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
	const pendingItems = useImportReviewStore((state) => state.projects);
	const removePendingItem = useImportReviewStore((state) => state.removeProjectDraft);
	const createMutation = useCreateProject();
	const deleteMutation = useDeleteProject();

	const isEditingProject = isSheetOpen && editingState?.section === "projects";
	const editingProject = isEditingProject && editingState.itemId ? projects.find((p) => p.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (!deleteConfirmation || deleteConfirmation.section !== "projects") return;
		deleteMutation.mutate(deleteConfirmation.itemId, {
			onSuccess: () => { toast.success("Project deleted"); closeDeleteConfirmation(); },
			onError: () => toast.error("Couldn't delete the project. Try again."),
		});
	};

	const handleSavePending = async (id: string, data: CreateProjectRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Project saved");
		} catch { toast.error("Couldn't save the project. Try again."); }
		finally { setSavingItemId(null); }
	};

	if (isLoading) return <ProfileItemSkeleton />;

	// An empty section offers its one action in the empty state instead.
	const isEmpty = projects.length === 0 && pendingItems.length === 0;

	const addButton = (
		<AddButton onClick={() => startAdding("projects")}>Add project</AddButton>
	);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="Projects"
					description="Work outside your jobs that shows what you can build."
					action={isEmpty ? undefined : addButton}
				/>

				{pendingItems.length > 0 && (
					<PendingPanel count={pendingItems.length} singular="project" plural="projects">
						{pendingItems.map((item) => (
							<PendingRow
								key={item.id}
								name={item.request.title}
								isSaving={savingItemId === item.id}
								onDiscard={() => removePendingItem(item.id)}
								onSave={withAsyncHandler(() => handleSavePending(item.id, item.request))}
							>
								<ProjectSummary project={item.request} pending />
							</PendingRow>
						))}
					</PendingPanel>
				)}

				{isEmpty && (
					<SectionEmpty title="No projects yet" action={addButton}>
						Add side projects, open source work or anything else you built.
					</SectionEmpty>
				)}

				{projects.length > 0 && (
					<EntryPanel>
						{projects.map((project) => (
							<EntryRow
								key={project.id}
								name={project.title}
								onEdit={() => startEditing("projects", project.id)}
								onDelete={() => openDeleteConfirmation("projects", project.id)}
							>
								<ProjectSummary project={project} />
							</EntryRow>
						))}
					</EntryPanel>
				)}
			</div>

			<EntrySheet
				open={isEditingProject}
				onClose={cancelEditing}
				title={editingProject ? "Edit project" : "Add project"}
				description="Appears in the Projects section of your resumes."
			>
				<ProjectForm project={editingProject} onSuccess={cancelEditing} onCancel={cancelEditing} />
			</EntrySheet>

			<DeleteEntryDialog
				open={deleteConfirmation?.section === "projects"}
				onClose={closeDeleteConfirmation}
				onConfirm={handleDelete}
				title="Delete this project?"
			/>
		</>
	);
}

function ProjectSummary({
	project,
	pending = false,
}: {
	project: CreateProjectRequest;
	pending?: boolean;
}) {
	const Heading = pending ? "h4" : "h3";
	const start = formatMonthYear(project.startDate);
	// "present" only reads as a range after a start date.
	const end = project.isOngoing && start ? "present" : formatMonthYear(project.endDate);
	const dates = [start, end].filter(Boolean).join(" to ");

	return (
		<>
			<Heading className="font-semibold">{project.title}</Heading>
			{project.description && (
				<p className={cn("text-muted-foreground text-sm", pending ? "whitespace-pre-wrap" : "line-clamp-2")}>
					{project.description}
				</p>
			)}
			<EntryMeta>
				{dates && <span>{dates}</span>}
				{project.projectUrl && (
					<a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-4 hover:no-underline">Open project</a>
				)}
			</EntryMeta>
			{project.technologies && <TagList value={project.technologies} />}
		</>
	);
}

function ProjectForm({ project, onSuccess, onCancel }: { project?: ProjectJsonResponse | null; onSuccess: () => void; onCancel: () => void }) {
	const createMutation = useCreateProject();
	const updateMutation = useUpdateProject();
	const form = useForm({
		resolver: zodResolver(createProjectSchema),
		defaultValues: {
			title: project?.title || "",
			description: project?.description ?? null,
			technologies: project?.technologies ?? null,
			projectUrl: project?.projectUrl ?? null,
			githubUrl: project?.githubUrl ?? null,
			startDate: project?.startDate ?? null,
			endDate: project?.endDate ?? null,
			displayOrder: project?.displayOrder ?? 0,
		},
	});
	const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

	const onSubmit = (data: unknown) => {
		const validatedData = data as CreateProjectRequest;
		if (project) {
			updateMutation.mutate({ id: project.id, data: validatedData }, {
				onSuccess: () => { toast.success("Changes saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the changes. Try again."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Project saved"); onSuccess(); },
				onError: () => toast.error("Couldn't save the project. Try again."),
			});
		}
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-2"><Label htmlFor="title">Title *</Label><Input id="title" {...register("title")} /><FormFieldError message={errors.title?.message} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" {...register("description")} rows={3} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="technologies">Technologies</Label><Input id="technologies" {...register("technologies")} placeholder="React, Node.js, PostgreSQL" /><p className="text-muted-foreground text-sm">Separate with commas.</p></div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2"><Label htmlFor="startDate">Start date</Label><Input id="startDate" type="month" {...register("startDate")} /></div>
				<div className="flex flex-col gap-2"><Label htmlFor="endDate">End date</Label><Input id="endDate" type="month" {...register("endDate")} /></div>
			</div>
			<div className="flex flex-col gap-2"><Label htmlFor="projectUrl">Project URL</Label><Input id="projectUrl" type="url" {...register("projectUrl")} placeholder="https://myproject.com" /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="githubUrl">Repository URL</Label><Input id="githubUrl" type="url" {...register("githubUrl")} placeholder="https://github.com/user/project" /></div>
			<FormActions
				onCancel={onCancel}
				isSubmitting={
					isSubmitting || createMutation.isPending || updateMutation.isPending
				}
			/>
		</form>
	);
}
