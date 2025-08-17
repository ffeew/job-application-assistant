"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, FolderOpen, Calendar, ExternalLink, Github } from "lucide-react";
import { useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/use-profile";
import type { ProjectResponse, CreateProjectRequest } from "@/lib/validators/profile.validator";

interface ProjectsListProps {
  projects: ProjectResponse[];
  isLoading: boolean;
}

interface ProjectFormData {
  title: string;
  description: string;
  technologies: string;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  projectUrl: string;
  githubUrl: string;
  displayOrder: number;
}

const emptyFormData: ProjectFormData = {
  title: "",
  description: "",
  technologies: "",
  startDate: "",
  endDate: "",
  isOngoing: false,
  projectUrl: "",
  githubUrl: "",
  displayOrder: 0,
};

export function ProjectsList({ projects, isLoading }: ProjectsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const handleChange = (field: keyof ProjectFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startAdding = () => {
    setFormData({ ...emptyFormData, displayOrder: projects.length });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEditing = (project: ProjectResponse) => {
    setFormData({
      title: project.title,
      description: project.description || "",
      technologies: project.technologies || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      isOngoing: project.isOngoing,
      projectUrl: project.projectUrl || "",
      githubUrl: project.githubUrl || "",
      displayOrder: project.displayOrder,
    });
    setEditingId(project.id);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const submitData: CreateProjectRequest = {
      title: formData.title,
      description: formData.description || null,
      technologies: formData.technologies || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      isOngoing: formData.isOngoing,
      projectUrl: formData.projectUrl || null,
      githubUrl: formData.githubUrl || null,
      displayOrder: formData.displayOrder,
    };

    if (isAdding) {
      createMutation.mutate(submitData, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error creating project:", error);
          alert("Error creating project. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData }, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error updating project:", error);
          alert("Error updating project. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    }
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
        <Button onClick={startAdding} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add Project" : "Edit Project"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="E-commerce Web Application"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Describe the project, its purpose, and your role..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="technologies">Technologies Used</Label>
                <Input
                  id="technologies"
                  value={formData.technologies}
                  onChange={(e) => handleChange("technologies", e.target.value)}
                  placeholder="React, Node.js, MongoDB, AWS"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="month"
                    value={formData.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="month"
                    value={formData.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    disabled={formData.isOngoing}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isOngoing"
                  checked={formData.isOngoing}
                  onChange={(e) => {
                    handleChange("isOngoing", e.target.checked);
                    if (e.target.checked) {
                      handleChange("endDate", "");
                    }
                  }}
                />
                <Label htmlFor="isOngoing">This is an ongoing project</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectUrl">Project URL</Label>
                  <Input
                    id="projectUrl"
                    type="url"
                    value={formData.projectUrl}
                    onChange={(e) => handleChange("projectUrl", e.target.value)}
                    placeholder="https://myproject.com"
                  />
                </div>
                <div>
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => handleChange("githubUrl", e.target.value)}
                    placeholder="https://github.com/username/project"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : isAdding ? "Add Project" : "Update Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                      disabled={isAdding || editingId !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                      disabled={isAdding || editingId !== null}
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