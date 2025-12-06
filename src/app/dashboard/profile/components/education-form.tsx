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
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { useUpdateEducation } from "@/app/dashboard/profile/mutations/use-update-education";
import { createEducationSchema } from "@/app/api/profile/validators";
import type { EducationResponse, CreateEducationRequest } from "@/app/api/profile/validators";

interface EducationFormProps {
  education?: EducationResponse;
  initialValues?: Partial<CreateEducationRequest>;
  onCancel: () => void;
  onSuccess: () => void;
  submitLabel?: string;
  onSubmitOverride?: (data: CreateEducationRequest) => Promise<void>;
}

export function EducationForm({
  education,
  initialValues,
  onCancel,
  onSuccess,
  submitLabel,
  onSubmitOverride,
}: EducationFormProps) {
  const createMutation = useCreateEducation();
  const updateMutation = useUpdateEducation();

  const form = useForm({
    resolver: zodResolver(createEducationSchema),
    defaultValues: {
      degree: education?.degree || initialValues?.degree || "",
      fieldOfStudy: education?.fieldOfStudy ?? initialValues?.fieldOfStudy ?? null,
      institution: education?.institution || initialValues?.institution || "",
      location: education?.location ?? initialValues?.location ?? null,
      startDate: education?.startDate ?? initialValues?.startDate ?? null,
      endDate: education?.endDate ?? initialValues?.endDate ?? null,
      gpa: education?.gpa ?? initialValues?.gpa ?? null,
      honors: education?.honors ?? initialValues?.honors ?? null,
      relevantCoursework: education?.relevantCoursework ?? initialValues?.relevantCoursework ?? null,
      displayOrder: education?.displayOrder ?? initialValues?.displayOrder ?? 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateEducationRequest;
    
    if (onSubmitOverride) {
      try {
        await onSubmitOverride(validatedData);
        onSuccess();
      } catch (error) {
        console.error("Error saving education draft:", error);
        toast.error("Failed to save draft. Please try again.");
      }
      return;
    }

    if (education) {
      updateMutation.mutate({ id: education.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Education updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating education:", error);
          toast.error("Error updating education. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Education added successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating education:", error);
          toast.error("Error creating education. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{education ? "Edit Education" : "Add Education"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="degree">Degree *</Label>
              <Input
                id="degree"
                {...register("degree")}
                placeholder="Bachelor of Science"
              />
              {errors.degree && (
                <p className="text-red-500 text-sm mt-1">{errors.degree.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fieldOfStudy">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                {...register("fieldOfStudy")}
                placeholder="Computer Science"
              />
              {errors.fieldOfStudy && (
                <p className="text-red-500 text-sm mt-1">{errors.fieldOfStudy.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="institution">Institution *</Label>
              <Input
                id="institution"
                {...register("institution")}
                placeholder="University of California"
              />
              {errors.institution && (
                <p className="text-red-500 text-sm mt-1">{errors.institution.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register("location")}
                placeholder="Berkeley, CA"
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
              )}
            </div>
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
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                {...register("gpa")}
                placeholder="3.8/4.0"
              />
              {errors.gpa && (
                <p className="text-red-500 text-sm mt-1">{errors.gpa.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="honors">Honors</Label>
              <Input
                id="honors"
                {...register("honors")}
                placeholder="Magna Cum Laude"
              />
              {errors.honors && (
                <p className="text-red-500 text-sm mt-1">{errors.honors.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="relevantCoursework">Relevant Coursework</Label>
            <Textarea
              id="relevantCoursework"
              {...register("relevantCoursework")}
              placeholder="Data Structures, Algorithms, Software Engineering..."
              rows={2}
            />
            {errors.relevantCoursework && (
              <p className="text-red-500 text-sm mt-1">{errors.relevantCoursework.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting
                ? "Saving..."
                : submitLabel
                  ? submitLabel
                  : education
                    ? "Update Education"
                    : "Add Education"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
