"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FolderOpen, Calendar, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";
import { toast } from "sonner";
import { useDeleteProject } from "@/app/dashboard/profile/mutations/use-delete-project";
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { ProjectsForm } from "./projects-form";
import type { ProjectResponse, CreateProjectRequest } from "@/app/api/profile/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface ProjectsListProps {
  projects: ProjectResponse[];
  isLoading: boolean;
}

export function ProjectsList({ projects, isLoading }: ProjectsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null);

  const deleteMutation = useDeleteProject();
  const createMutation = useCreateProject();
  const pendingItems = useImportReviewStore((state) => state.projects);
  const updatePendingItem = useImportReviewStore((state) => state.updateProjectDraft);
  const removePendingItem = useImportReviewStore((state) => state.removeProjectDraft);

  const startAdding = () => {
    setIsAdding(true);
    setEditingProject(null);
  };

  const startEditing = (project: ProjectResponse) => {
    setEditingProject(project);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingProject(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Project deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting project:", error);
          toast.error("Error deleting project. Please try again.");
        },
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const [year, month] = dateString.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  };

  const handleSavePending = async (id: string, data: CreateProjectRequest) => {
    setSavingPendingId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Project saved to your profile.");
    } catch (error) {
      console.error("Failed to save project:", error);
      toast.error("Failed to save project. Please try again.");
    } finally {
      setSavingPendingId(null);
    }
  };

  const handleUpdatePending = async (id: string, data: CreateProjectRequest) => {
    updatePendingItem(id, data);
    toast.success("Draft updated.");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ProfileItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingItems.length > 0 && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-sm font-semibold text-primary">
                Pending project draft{pendingItems.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-primary/80">
                Review, edit, or save these entries individually.
              </p>
            </div>
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div key={item.id} className="rounded-md border border-primary/20 bg-primary/10 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 text-sm text-primary">
                      <p className="font-semibold">{item.request.title}</p>
                      {item.request.description && (
                        <p className="text-xs text-primary/80">{item.request.description}</p>
                      )}
                      {item.request.technologies && (
                        <p className="text-xs text-primary/80">Tech: {item.request.technologies}</p>
                      )}
                      {item.warnings.length > 0 && (
                        <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700">
                          {item.warnings.map((warning) => (
                            <li key={`${item.id}-warning-${warning}`}>{warning}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPendingId(item.id)}
                        disabled={savingPendingId === item.id}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit draft
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePendingItem(item.id)}
                        disabled={savingPendingId === item.id}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePending(item.id, item.request)}
                        disabled={savingPendingId === item.id}
                      >
                        {savingPendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        {savingPendingId === item.id ? "Saving" : "Save"}
                      </Button>
                    </div>
                  </div>
                  {editingPendingId === item.id && (
                    <div className="mt-4">
                      <ProjectsForm
                        onCancel={() => setEditingPendingId(null)}
                        onSuccess={() => setEditingPendingId(null)}
                        submitLabel="Save Draft"
                        initialValues={item.request}
                        onSubmitOverride={async (data) => {
                          await handleUpdatePending(item.id, data);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Projects
          </h2>
          <p className="text-sm text-muted-foreground">
            Showcase your notable projects and portfolio work
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingProject !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {(isAdding || editingProject !== null) && (
        <ProjectsForm
          project={editingProject || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects added</h3>
              <p className="text-muted-foreground mb-4">
                Add projects to showcase your portfolio and technical skills.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{project.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {(project.startDate || project.endDate) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(project.startDate)} - {project.isOngoing ? "Present" : formatDate(project.endDate)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(project)}
                      disabled={isAdding || editingProject !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                      disabled={isAdding || editingProject !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-sm mb-3 text-muted-foreground">
                    {project.description}
                  </p>
                )}

                {project.technologies && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.technologies.split(",").map((tech, index) => (
                      <Badge key={index} variant="secondary">
                        {tech.trim()}
                      </Badge>
                    ))}
                  </div>
                )}

                {(project.projectUrl || project.githubUrl) && (
                  <div className="flex gap-2">
                    {project.projectUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Live Demo
                        </a>
                      </Button>
                    )}
                    {project.githubUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                          <GithubIcon className="mr-2 h-4 w-4" width={16} height={16} />
                          Source Code
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
