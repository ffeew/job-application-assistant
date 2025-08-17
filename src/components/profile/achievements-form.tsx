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
import { useCreateAchievement, useUpdateAchievement } from "@/hooks/use-profile";
import { createAchievementSchema } from "@/lib/validators/profile.validator";
import type { AchievementResponse, CreateAchievementRequest } from "@/lib/validators/profile.validator";

interface AchievementsFormProps {
  achievement?: AchievementResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AchievementsForm({ achievement, onCancel, onSuccess }: AchievementsFormProps) {
  const createMutation = useCreateAchievement();
  const updateMutation = useUpdateAchievement();

  const form = useForm({
    resolver: zodResolver(createAchievementSchema),
    defaultValues: {
      title: achievement?.title || "",
      description: achievement?.description || null,
      date: achievement?.date || null,
      organization: achievement?.organization || null,
      url: achievement?.url || null,
      displayOrder: achievement?.displayOrder || 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateAchievementRequest;
    
    if (achievement) {
      updateMutation.mutate({ id: achievement.id, data: validatedData }, {
        onSuccess,
        onError: (error) => {
          console.error("Error updating achievement:", error);
          toast.error("Error updating achievement. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess,
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Achievement Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Employee of the Year"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe the achievement, what it recognizes, and its significance..."
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date Received</Label>
              <Input
                id="date"
                type="month"
                {...register("date")}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="organization">Awarding Organization</Label>
              <Input
                id="organization"
                {...register("organization")}
                placeholder="Company Name, Institution, etc."
              />
              {errors.organization && (
                <p className="text-red-500 text-sm mt-1">{errors.organization.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="url">Related URL</Label>
            <Input
              id="url"
              type="url"
              {...register("url")}
              placeholder="https://example.com/award-details"
            />
            {errors.url && (
              <p className="text-red-500 text-sm mt-1">{errors.url.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : achievement ? "Update Achievement" : "Add Achievement"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}