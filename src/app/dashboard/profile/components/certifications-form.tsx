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
import { createCertificationSchema } from "@/app/api/profile/validators";
import type { CertificationResponse, CreateCertificationRequest } from "@/app/api/profile/validators";

interface CertificationsFormProps {
  certification?: CertificationResponse;
  initialValues?: Partial<CreateCertificationRequest>;
  onCancel: () => void;
  onSuccess: () => void;
  submitLabel?: string;
  onSubmitOverride?: (data: CreateCertificationRequest) => Promise<void>;
}

export function CertificationsForm({
  certification,
  initialValues,
  onCancel,
  onSuccess,
  submitLabel,
  onSubmitOverride,
}: CertificationsFormProps) {
  const createMutation = useCreateCertification();
  const updateMutation = useUpdateCertification();

  const form = useForm({
    resolver: zodResolver(createCertificationSchema),
    defaultValues: {
      name: certification?.name || initialValues?.name || "",
      issuingOrganization: certification?.issuingOrganization || initialValues?.issuingOrganization || "",
      issueDate: certification?.issueDate ?? initialValues?.issueDate ?? null,
      expirationDate: certification?.expirationDate ?? initialValues?.expirationDate ?? null,
      credentialId: certification?.credentialId ?? initialValues?.credentialId ?? null,
      credentialUrl: certification?.credentialUrl ?? initialValues?.credentialUrl ?? null,
      displayOrder: certification?.displayOrder ?? initialValues?.displayOrder ?? 0,
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    const validatedData = data as CreateCertificationRequest;

    if (onSubmitOverride) {
      try {
        await onSubmitOverride(validatedData);
        onSuccess();
      } catch (error) {
        console.error("Error saving certification draft:", error);
        toast.error("Failed to save draft. Please try again.");
      }
      return;
    }

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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input id="issueDate" type="month" {...register("issueDate")} />
              {errors.issueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.issueDate.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="expirationDate">Expiration Date</Label>
              <Input id="expirationDate" type="month" {...register("expirationDate")} />
              {errors.expirationDate && (
                <p className="text-red-500 text-sm mt-1">{errors.expirationDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <Input id="credentialId" {...register("credentialId")} placeholder="ABC-12345" />
              {errors.credentialId && (
                <p className="text-red-500 text-sm mt-1">{errors.credentialId.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="credentialUrl">Credential URL</Label>
              <Input
                id="credentialUrl"
                type="url"
                {...register("credentialUrl")}
                placeholder="https://example.com/credential"
              />
              {errors.credentialUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.credentialUrl.message}</p>
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
                  : certification
                    ? "Update Certification"
                    : "Add Certification"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
