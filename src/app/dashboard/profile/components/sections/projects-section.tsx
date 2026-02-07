"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, FolderOpen, Calendar, ExternalLink, Save, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { useUpdateProject } from "@/app/dashboard/profile/mutations/use-update-project";
import { useDeleteProject } from "@/app/dashboard/profile/mutations/use-delete-project";
import { createProjectSchema } from "@/app/api/profile/validators";
import type { ProjectResponse, CreateProjectRequest } from "@/app/api/profile/validators";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "../profile-item-skeleton";

interface ProjectsSectionProps {
	projects: ProjectResponse[];
	isLoading: boolean;
}

export function ProjectsSection({ projects, isLoading }: ProjectsSectionProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const editingState = useProfileUIStore((state) => state.editingState);
	const isSheetOpen = useProfileUIStore((state) => state.isSheetOpen);
	const startAdding = useProfileUIStore((state) => state.startAdding);
	const startEditing = useProfileUIStore((state) => state.startEditing);
	const cancelEditing = useProfileUIStore((state) => state.cancelEditing);
	const savingItemId = useProfileUIStore((state) => state.savingItemId);
	const setSavingItemId = useProfileUIStore((state) => state.setSavingItemId);
	const pendingItems = useImportReviewStore((state) => state.projects);
	const removePendingItem = useImportReviewStore((state) => state.removeProjectDraft);
	const createMutation = useCreateProject();
	const deleteMutation = useDeleteProject();

	const isEditingProject = isSheetOpen && editingState?.section === "projects";
	const editingProject = isEditingProject && editingState?.itemId ? projects.find((p) => p.id === editingState.itemId) : null;

	const handleDelete = () => {
		if (deleteId === null) return;
		deleteMutation.mutate(deleteId, {
			onSuccess: () => { toast.success("Project deleted!"); setDeleteId(null); },
			onError: () => toast.error("Error deleting project."),
		});
	};

	const handleSavePending = async (id: string, data: CreateProjectRequest) => {
		setSavingItemId(id);
		try {
			await createMutation.mutateAsync(data);
			removePendingItem(id);
			toast.success("Project saved!");
		} catch { toast.error("Failed to save project."); }
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
						<h1 className="text-2xl font-bold flex items-center gap-2"><FolderOpen className="h-6 w-6" />Projects</h1>
						<p className="text-muted-foreground">Your personal and professional projects</p>
					</div>
					<Button onClick={() => startAdding("projects")}><Plus className="mr-2 h-4 w-4" />Add Project</Button>
				</div>

				{pendingItems.length > 0 && (
					<Card className="border-dashed border-primary/40 bg-primary/5">
						<CardContent className="pt-6 space-y-3">
							<p className="text-sm font-semibold text-primary">{pendingItems.length} pending project{pendingItems.length !== 1 ? "s" : ""}</p>
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

				{projects.length === 0 && pendingItems.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No projects added</h3>
							<p className="text-muted-foreground mb-6">Showcase your work.</p>
							<Button onClick={() => startAdding("projects")}><Plus className="mr-2 h-4 w-4" />Add Project</Button>
						</CardContent>
					</Card>
				)}

				<div className="space-y-3">
					{projects.map((project) => (
						<Card key={project.id} className="group hover:shadow-md transition-shadow">
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<h3 className="font-semibold text-lg">{project.title}</h3>
										{project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											{(project.startDate || project.endDate) && (
												<div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span></div>
											)}
											{project.projectUrl && (
												<a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground"><ExternalLink className="h-4 w-4" />View</a>
											)}
										</div>
										{project.technologies && (
											<div className="flex flex-wrap gap-1.5 pt-1">
												{project.technologies.split(",").map((tech, idx) => <Badge key={idx} variant="secondary" className="text-xs">{tech.trim()}</Badge>)}
											</div>
										)}
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
										<Button variant="ghost" size="icon" onClick={() => startEditing("projects", project.id)}><Edit className="h-4 w-4" /></Button>
										<Button variant="ghost" size="icon" onClick={() => setDeleteId(project.id)}><Trash2 className="h-4 w-4" /></Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			<Sheet open={isEditingProject} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader><SheetTitle>{editingProject ? "Edit Project" : "Add Project"}</SheetTitle><SheetDescription>{editingProject ? "Update project details" : "Add a new project"}</SheetDescription></SheetHeader>
					<ProjectForm project={editingProject} onSuccess={cancelEditing} onCancel={cancelEditing} />
				</SheetContent>
			</Sheet>

			<AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader><AlertDialogTitle>Delete project?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
					<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function ProjectForm({ project, onSuccess, onCancel }: { project?: ProjectResponse | null; onSuccess: () => void; onCancel: () => void }) {
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

	const onSubmit = async (data: unknown) => {
		const validatedData = data as CreateProjectRequest;
		if (project) {
			updateMutation.mutate({ id: project.id, data: validatedData }, {
				onSuccess: () => { toast.success("Project updated!"); onSuccess(); },
				onError: () => toast.error("Error updating project."),
			});
		} else {
			createMutation.mutate(validatedData, {
				onSuccess: () => { toast.success("Project added!"); onSuccess(); },
				onError: () => toast.error("Error adding project."),
			});
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 mt-6">
			<div className="flex flex-col gap-2"><Label htmlFor="title">Title *</Label><Input id="title" {...register("title")} placeholder="Project Name" />{errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}</div>
			<div className="flex flex-col gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" {...register("description")} placeholder="What does this project do?" rows={3} /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="technologies">Technologies</Label><Input id="technologies" {...register("technologies")} placeholder="React, Node.js, PostgreSQL" /><p className="text-xs text-muted-foreground">Separate with commas</p></div>
			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="month" {...register("startDate")} /></div>
				<div className="flex flex-col gap-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="month" {...register("endDate")} /></div>
			</div>
			<div className="flex flex-col gap-2"><Label htmlFor="projectUrl">Project URL</Label><Input id="projectUrl" type="url" {...register("projectUrl")} placeholder="https://myproject.com" /></div>
			<div className="flex flex-col gap-2"><Label htmlFor="githubUrl">Repository URL</Label><Input id="githubUrl" type="url" {...register("githubUrl")} placeholder="https://github.com/user/project" /></div>
			<div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4" />{isSubmitting ? "Saving..." : project ? "Update" : "Add"}</Button></div>
		</form>
	);
}
