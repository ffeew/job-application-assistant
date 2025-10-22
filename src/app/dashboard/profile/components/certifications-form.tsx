"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { useUpdateCertification } from "@/app/dashboard/profile/mutations/use-update-certification";
import { createCertificationSchema } from "@/lib/validators/profile.validator";
import type { CertificationResponse, CreateCertificationRequest } from "@/lib/validators/profile.validator";

interface CertificationsFormProps {
  certification?: CertificationResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CertificationsForm({ certification, onCancel, onSuccess }: CertificationsFormProps) {
  const createMutation = useCreateCertification();
  const updateMutation = useUpdateCertification();

  const form = useForm({
    resolver: zodResolver(createCertificationSchema),
    defaultValues: {
      name: certification?.name || "",
      issuingOrganization: certification?.issuingOrganization || "",
      issueDate: certification?.issueDate || null,
      expirationDate: certification?.expirationDate || null,
      credentialId: certification?.credentialId || null,
      credentialUrl: certification?.credentialUrl || null,
      displayOrder: certification?.displayOrder || 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateCertificationRequest;
    
    if (certification) {
      updateMutation.mutate({ id: certification.id, data: validatedData }, {
        onSuccess: () => {
          toast.success("Certification updated successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error updating certification:", error);
          toast.error("Error updating certification. Please try again.");
        },
      });
    } else {
      createMutation.mutate(validatedData, {
        onSuccess: () => {
          toast.success("Certification added successfully!");
          onSuccess();
        },
        onError: (error) => {
          console.error("Error creating certification:", error);
          toast.error("Error creating certification. Please try again.");
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{certification ? "Edit Certification" : "Add Certification"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Certification Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="AWS Certified Solutions Architect"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuingOrganization">Issuing Organization *</Label>
            <Input
              id="issuingOrganization"
              {...register("issuingOrganization")}
              placeholder="Amazon Web Services"
            />
            {errors.issuingOrganization && (
              <p className="text-red-500 text-sm mt-1">{errors.issuingOrganization.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="month"
                {...register("issueDate")}
              />
              {errors.issueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.issueDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expirationDate">Expiration Date</Label>
              <Input
                id="expirationDate"
                type="month"
                {...register("expirationDate")}
              />
              {errors.expirationDate && (
                <p className="text-red-500 text-sm mt-1">{errors.expirationDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <Input
                id="credentialId"
                {...register("credentialId")}
                placeholder="ABC123DEF456"
              />
              {errors.credentialId && (
                <p className="text-red-500 text-sm mt-1">{errors.credentialId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="credentialUrl">Credential URL</Label>
              <Input
                id="credentialUrl"
                type="url"
                {...register("credentialUrl")}
                placeholder="https://www.credly.com/badges/..."
              />
              {errors.credentialUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.credentialUrl.message}</p>
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
              {isSubmitting ? "Saving..." : certification ? "Update Certification" : "Add Certification"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}