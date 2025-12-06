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
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { useUpdateAchievement } from "@/app/dashboard/profile/mutations/use-update-achievement";
import { createAchievementSchema } from "@/app/api/profile/validators";
import type { AchievementResponse, CreateAchievementRequest } from "@/app/api/profile/validators";

interface AchievementsFormProps {
  achievement?: AchievementResponse;
  initialValues?: Partial<CreateAchievementRequest>;
  onCancel: () => void;
  onSuccess: () => void;
  submitLabel?: string;
  onSubmitOverride?: (data: CreateAchievementRequest) => Promise<void>;
}

export function AchievementsForm({
  achievement,
  initialValues,
  onCancel,
  onSuccess,
  submitLabel,
  onSubmitOverride,
}: AchievementsFormProps) {
  const createMutation = useCreateAchievement();
  const updateMutation = useUpdateAchievement();

  const form = useForm({
    resolver: zodResolver(createAchievementSchema),
    defaultValues: {
      title: achievement?.title || initialValues?.title || "",
      description: achievement?.description ?? initialValues?.description ?? null,
      organization: achievement?.organization ?? initialValues?.organization ?? null,
      date: achievement?.date ?? initialValues?.date ?? null,
      url: achievement?.url ?? initialValues?.url ?? null,
      displayOrder: achievement?.displayOrder ?? initialValues?.displayOrder ?? 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    const validatedData = data as CreateAchievementRequest;

    if (onSubmitOverride) {
      try {
        await onSubmitOverride(validatedData);
        onSuccess();
      } catch (error) {
        console.error("Error saving achievement draft:", error);
        toast.error("Failed to save draft. Please try again.");
      }
      return;
    }

    if (achievement) {
      updateMutation.mutate({ id: achievement.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Achievement updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating achievement:", error);
          toast.error("Error updating achievement. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Achievement added successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating achievement:", error);
          toast.error("Error creating achievement. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{achievement ? "Edit Achievement" : "Add Achievement"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Employee of the Quarter"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              {...register("organization")}
              placeholder="Acme Corp"
            />
            {errors.organization && (
              <p className="text-red-500 text-sm mt-1">{errors.organization.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="month" {...register("date")} />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Highlight what this achievement represents..."
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="url">Supporting Link</Label>
            <Input
              id="url"
              type="url"
              {...register("url")}
              placeholder="https://example.com/achievement"
            />
            {errors.url && (
              <p className="text-red-500 text-sm mt-1">{errors.url.message}</p>
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
                  : achievement
                    ? "Update Achievement"
                    : "Add Achievement"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
