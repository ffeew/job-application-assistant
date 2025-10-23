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
import { useCreateWorkExperience } from "@/app/dashboard/profile/mutations/use-create-work-experience";
import { useUpdateWorkExperience } from "@/app/dashboard/profile/mutations/use-update-work-experience";
import { createWorkExperienceSchema } from "@/app/api/profile/validators";
import type { WorkExperienceResponse, CreateWorkExperienceRequest } from "@/app/api/profile/validators";

interface WorkExperienceFormProps {
  experience?: WorkExperienceResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

export function WorkExperienceForm({ experience, onCancel, onSuccess }: WorkExperienceFormProps) {
  const createMutation = useCreateWorkExperience();
  const updateMutation = useUpdateWorkExperience();

  const form = useForm({
    resolver: zodResolver(createWorkExperienceSchema),
    defaultValues: {
      jobTitle: experience?.jobTitle || "",
      company: experience?.company || "",
      location: experience?.location || null,
      startDate: experience?.startDate || "",
      endDate: experience?.endDate || null,
      isCurrent: experience?.isCurrent || false,
      description: experience?.description || null,
      technologies: experience?.technologies || null,
      displayOrder: experience?.displayOrder || 0,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const isCurrent = watch("isCurrent");

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateWorkExperienceRequest;
    
    if (experience) {
      updateMutation.mutate({ id: experience.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Work experience updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating work experience:", error);
          toast.error("Error updating work experience. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Work experience created successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating work experience:", error);
          toast.error("Error creating work experience. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{experience ? "Edit Work Experience" : "Add Work Experience"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                {...register("jobTitle")}
                placeholder="Software Engineer"
              />
              {errors.jobTitle && (
                <p className="text-red-500 text-sm mt-1">{errors.jobTitle.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                {...register("company")}
                placeholder="Tech Corp"
              />
              {errors.company && (
                <p className="text-red-500 text-sm mt-1">{errors.company.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="San Francisco, CA"
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start Date *</Label>
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
                disabled={isCurrent}
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCurrent"
              {...register("isCurrent")}
              onChange={(e) => {
                setValue("isCurrent", e.target.checked);
                if (e.target.checked) {
                  setValue("endDate", null);
                }
              }}
            />
            <Label htmlFor="isCurrent">I currently work here</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="technologies">Technologies</Label>
            <Input
              id="technologies"
              {...register("technologies")}
              placeholder="React, Node.js, Python, AWS"
            />
            {errors.technologies && (
              <p className="text-red-500 text-sm mt-1">{errors.technologies.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : experience ? "Update Experience" : "Add Experience"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}