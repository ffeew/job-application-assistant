"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FolderOpen, Calendar, ExternalLink, Github } from "lucide-react";
import { useDeleteProject } from "@/hooks/use-profile";
import { ProjectsForm } from "./projects-form";
import type { ProjectResponse } from "@/lib/validators/profile.validator";

interface ProjectsListProps {
  projects: ProjectResponse[];
  isLoading: boolean;
}


export function ProjectsList({ projects, isLoading }: ProjectsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);

  const deleteMutation = useDeleteProject();

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
        onError: (error) => {
          console.error("Error deleting project:", error);
          alert("Error deleting project. Please try again.");
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month] = dateString.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                          {formatDate(project.startDate || "")} - {project.isOngoing ? "Present" : formatDate(project.endDate || "")}
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
                          <Github className="mr-2 h-4 w-4" />
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