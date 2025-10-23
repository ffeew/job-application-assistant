"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { useUpdateProject } from "@/app/dashboard/profile/mutations/use-update-project";
import { createProjectSchema } from "@/app/api/profile/validators";
import type { ProjectResponse, CreateProjectRequest } from "@/app/api/profile/validators";

interface ProjectsFormProps {
  project?: ProjectResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ProjectsForm({ project, onCancel, onSuccess }: ProjectsFormProps) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const form = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: project?.title || "",
      description: project?.description || null,
      technologies: project?.technologies || null,
      startDate: project?.startDate || null,
      endDate: project?.endDate || null,
      isOngoing: project?.isOngoing || false,
      projectUrl: project?.projectUrl || null,
      githubUrl: project?.githubUrl || null,
      displayOrder: project?.displayOrder || 0,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const isOngoing = watch("isOngoing");

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateProjectRequest;
    
    if (project) {
      updateMutation.mutate({ id: project.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Project updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating project:", error);
          toast.error("Error updating project. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Project added successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating project:", error);
          toast.error("Error creating project. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project ? "Edit Project" : "Add Project"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="E-commerce Web Application"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe the project, its purpose, and your role..."
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="technologies">Technologies Used</Label>
            <Input
              id="technologies"
              {...register("technologies")}
              placeholder="React, Node.js, MongoDB, AWS"
            />
            {errors.technologies && (
              <p className="text-red-500 text-sm mt-1">{errors.technologies.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="month"
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="month"
                {...register("endDate")}
                disabled={isOngoing}
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isOngoing"
              {...register("isOngoing")}
              onChange={(e) => {
                setValue("isOngoing", e.target.checked);
                if (e.target.checked) {
                  setValue("endDate", null);
                }
              }}
            />
            <Label htmlFor="isOngoing">This is an ongoing project</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="projectUrl">Project URL</Label>
              <Input
                id="projectUrl"
                type="url"
                {...register("projectUrl")}
                placeholder="https://myproject.com"
              />
              {errors.projectUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.projectUrl.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="githubUrl">GitHub URL</Label>
              <Input
                id="githubUrl"
                type="url"
                {...register("githubUrl")}
                placeholder="https://github.com/username/project"
              />
              {errors.githubUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.githubUrl.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : project ? "Update Project" : "Add Project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}