"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateReference, useUpdateReference } from "@/hooks/use-profile";
import { createReferenceSchema } from "@/lib/validators/profile.validator";
import type { ReferenceResponse, CreateReferenceRequest } from "@/lib/validators/profile.validator";

interface ReferencesFormProps {
  reference?: ReferenceResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

const relationships = [
  { value: "manager", label: "Manager" },
  { value: "colleague", label: "Colleague" },
  { value: "client", label: "Client" },
  { value: "professor", label: "Professor" },
  { value: "mentor", label: "Mentor" },
  { value: "other", label: "Other" },
];

export function ReferencesForm({ reference, onCancel, onSuccess }: ReferencesFormProps) {
  const createMutation = useCreateReference();
  const updateMutation = useUpdateReference();

  const form = useForm({
    resolver: zodResolver(createReferenceSchema),
    defaultValues: {
      name: reference?.name || "",
      title: reference?.title || null,
      company: reference?.company || null,
      email: reference?.email || null,
      phone: reference?.phone || null,
      relationship: reference?.relationship || null,
      displayOrder: reference?.displayOrder || 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateReferenceRequest;
    
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="John Smith"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Senior Software Engineer"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
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

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <select
              id="relationship"
              {...register("relationship")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select relationship</option>
              {relationships.map(rel => (
                <option key={rel.value} value={rel.value}>{rel.label}</option>
              ))}
            </select>
            {errors.relationship && (
              <p className="text-red-500 text-sm mt-1">{errors.relationship.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john.smith@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : reference ? "Update Reference" : "Add Reference"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}