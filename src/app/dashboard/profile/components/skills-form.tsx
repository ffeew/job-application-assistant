"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { useUpdateSkill } from "@/app/dashboard/profile/mutations/use-update-skill";
import { createSkillSchema } from "@/app/api/profile/validators";
import type { SkillResponse, CreateSkillRequest } from "@/app/api/profile/validators";

interface SkillFormProps {
  skill?: SkillResponse;
  initialValues?: Partial<CreateSkillRequest>;
  onCancel: () => void;
  onSuccess: () => void;
  submitLabel?: string;
  onSubmitOverride?: (data: CreateSkillRequest) => Promise<void>;
}

const skillCategories = [
  { value: "technical", label: "Technical" },
  { value: "soft", label: "Soft Skills" },
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

export function SkillForm({
  skill,
  initialValues,
  onCancel,
  onSuccess,
  submitLabel,
  onSubmitOverride,
}: SkillFormProps) {
  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();

  const form = useForm({
    resolver: zodResolver(createSkillSchema),
    defaultValues: {
      name: skill?.name || initialValues?.name || "",
      category: skill?.category || initialValues?.category || "technical",
      proficiencyLevel: skill?.proficiencyLevel ?? initialValues?.proficiencyLevel ?? null,
      yearsOfExperience: skill?.yearsOfExperience ?? initialValues?.yearsOfExperience ?? null,
      displayOrder: skill?.displayOrder ?? initialValues?.displayOrder ?? 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    const validatedData = data as CreateSkillRequest;

    if (onSubmitOverride) {
      try {
        await onSubmitOverride(validatedData);
        onSuccess();
      } catch (error) {
        console.error("Error saving skill draft:", error);
        toast.error("Failed to save draft. Please try again.");
      }
      return;
    }

    if (skill) {
      updateMutation.mutate({ id: skill.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Skill updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating skill:", error);
          toast.error("Error updating skill. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Skill added successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating skill:", error);
          toast.error("Error creating skill. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{skill ? "Edit Skill" : "Add Skill"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Skill Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="React"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                {...register("category")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {skillCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="proficiencyLevel">Proficiency Level</Label>
              <select
                id="proficiencyLevel"
                {...register("proficiencyLevel")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select level</option>
                {proficiencyLevels.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
              {errors.proficiencyLevel && (
                <p className="text-red-500 text-sm mt-1">{errors.proficiencyLevel.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                {...register("yearsOfExperience", { valueAsNumber: true })}
                placeholder="3"
              />
              {errors.yearsOfExperience && (
                <p className="text-red-500 text-sm mt-1">{errors.yearsOfExperience.message}</p>
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
              {isSubmitting
                ? "Saving..."
                : submitLabel
                  ? submitLabel
                  : skill
                    ? "Update Skill"
                    : "Add Skill"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
