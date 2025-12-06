"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";
import { useUpdateReference } from "@/app/dashboard/profile/mutations/use-update-reference";
import { createReferenceSchema } from "@/app/api/profile/validators";
import type { ReferenceResponse, CreateReferenceRequest } from "@/app/api/profile/validators";

interface ReferencesFormProps {
  reference?: ReferenceResponse;
  initialValues?: Partial<CreateReferenceRequest>;
  onCancel: () => void;
  onSuccess: () => void;
  submitLabel?: string;
  onSubmitOverride?: (data: CreateReferenceRequest) => Promise<void>;
}

export function ReferencesForm({
  reference,
  initialValues,
  onCancel,
  onSuccess,
  submitLabel,
  onSubmitOverride,
}: ReferencesFormProps) {
  const createMutation = useCreateReference();
  const updateMutation = useUpdateReference();

  const form = useForm({
    resolver: zodResolver(createReferenceSchema),
    defaultValues: {
      name: reference?.name || initialValues?.name || "",
      title: reference?.title ?? initialValues?.title ?? null,
      company: reference?.company ?? initialValues?.company ?? null,
      email: reference?.email ?? initialValues?.email ?? null,
      phone: reference?.phone ?? initialValues?.phone ?? null,
      relationship: reference?.relationship ?? initialValues?.relationship ?? null,
      displayOrder: reference?.displayOrder ?? initialValues?.displayOrder ?? 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    const validatedData = data as CreateReferenceRequest;

    if (onSubmitOverride) {
      try {
        await onSubmitOverride(validatedData);
        onSuccess();
      } catch (error) {
        console.error("Error saving reference draft:", error);
        toast.error("Failed to save draft. Please try again.");
      }
      return;
    }

    if (reference) {
      updateMutation.mutate({ id: reference.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Reference updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating reference:", error);
          toast.error("Error updating reference. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Reference added successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating reference:", error);
          toast.error("Error creating reference. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{reference ? "Edit Reference" : "Add Reference"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} placeholder="Jane Smith" />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="Engineering Manager" />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} placeholder="Acme Corp" />
              {errors.company && (
                <p className="text-red-500 text-sm mt-1">{errors.company.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Input id="relationship" {...register("relationship")} placeholder="Manager" />
              {errors.relationship && (
                <p className="text-red-500 text-sm mt-1">{errors.relationship.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="jane@example.com" />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+1 (555) 123-4567" />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
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
                  : reference
                    ? "Update Reference"
                    : "Add Reference"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
