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
import { useCreateEducation, useUpdateEducation } from "@/hooks/use-profile";
import { createEducationSchema } from "@/lib/validators/profile.validator";
import type { EducationResponse, CreateEducationRequest } from "@/lib/validators/profile.validator";

interface EducationFormProps {
  education?: EducationResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EducationForm({ education, onCancel, onSuccess }: EducationFormProps) {
  const createMutation = useCreateEducation();
  const updateMutation = useUpdateEducation();

  const form = useForm({
    resolver: zodResolver(createEducationSchema),
    defaultValues: {
      degree: education?.degree || "",
      fieldOfStudy: education?.fieldOfStudy || null,
      institution: education?.institution || "",
      location: education?.location || null,
      startDate: education?.startDate || null,
      endDate: education?.endDate || null,
      gpa: education?.gpa || null,
      honors: education?.honors || null,
      relevantCoursework: education?.relevantCoursework || null,
      displayOrder: education?.displayOrder || 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateEducationRequest;
    
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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

          <div className="space-y-2">
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : education ? "Update Education" : "Add Education"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}