"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Award, Calendar, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteCertification } from "@/app/dashboard/profile/mutations/use-delete-certification";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { CertificationsForm } from "./certifications-form";
import type { CertificationResponse, CreateCertificationRequest } from "@/app/api/profile/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface CertificationsListProps {
  certifications: CertificationResponse[];
  isLoading: boolean;
}

export function CertificationsList({ certifications, isLoading }: CertificationsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCertification, setEditingCertification] = useState<CertificationResponse | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null);

  const deleteMutation = useDeleteCertification();
  const createMutation = useCreateCertification();
  const pendingItems = useImportReviewStore((state) => state.certifications);
  const updatePendingItem = useImportReviewStore((state) => state.updateCertificationDraft);
  const removePendingItem = useImportReviewStore((state) => state.removeCertificationDraft);

  const startAdding = () => {
    setIsAdding(true);
    setEditingCertification(null);
  };

  const startEditing = (certification: CertificationResponse) => {
    setEditingCertification(certification);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingCertification(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this certification?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Certification deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting certification:", error);
          toast.error("Error deleting certification. Please try again.");
        },
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const [year, month] = dateString.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  };

  const handleSavePending = async (id: string, data: CreateCertificationRequest) => {
    setSavingPendingId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Certification saved to your profile.");
    } catch (error) {
      console.error("Failed to save certification:", error);
      toast.error("Failed to save certification. Please try again.");
    } finally {
      setSavingPendingId(null);
    }
  };

  const handleUpdatePending = async (id: string, data: CreateCertificationRequest) => {
    updatePendingItem(id, data);
    toast.success("Draft updated.");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ProfileItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingItems.length > 0 && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-sm font-semibold text-primary">
                Pending certification draft{pendingItems.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-primary/80">
                Review, edit, or save these entries individually.
              </p>
            </div>
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div key={item.id} className="rounded-md border border-primary/20 bg-primary/10 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 text-sm text-primary">
                      <p className="font-semibold">
                        {[item.request.name, item.request.issuingOrganization]
                          .filter(Boolean)
                          .join(" · ") || "Pending certification"}
                      </p>
                      {item.request.credentialId && (
                        <p className="text-xs text-primary/80">ID: {item.request.credentialId}</p>
                      )}
                      {item.warnings.length > 0 && (
                        <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700">
                          {item.warnings.map((warning) => (
                            <li key={`${item.id}-warning-${warning}`}>{warning}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPendingId(item.id)}
                        disabled={savingPendingId === item.id}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit draft
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePendingItem(item.id)}
                        disabled={savingPendingId === item.id}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePending(item.id, item.request)}
                        disabled={savingPendingId === item.id}
                      >
                        {savingPendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        {savingPendingId === item.id ? "Saving" : "Save"}
                      </Button>
                    </div>
                  </div>
                  {editingPendingId === item.id && (
                    <div className="mt-4">
                      <CertificationsForm
                        onCancel={() => setEditingPendingId(null)}
                        onSuccess={() => setEditingPendingId(null)}
                        submitLabel="Save Draft"
                        initialValues={item.request}
                        onSubmitOverride={async (data) => {
                          await handleUpdatePending(item.id, data);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your professional certifications and credentials
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingCertification !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certification
        </Button>
      </div>

      {(isAdding || editingCertification !== null) && (
        <CertificationsForm
          certification={editingCertification || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {certifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No certifications added</h3>
              <p className="text-muted-foreground mb-4">
                Add your professional certifications to showcase your expertise.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Certification
              </Button>
            </CardContent>
          </Card>
        ) : (
          certifications.map((certification) => (
            <Card key={certification.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{certification.name}</h3>
                    <p className="text-muted-foreground">{certification.issuingOrganization}</p>
                    {certification.credentialId && (
                      <p className="text-sm text-muted-foreground">ID: {certification.credentialId}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(certification)}
                      disabled={isAdding || editingCertification !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(certification.id)}
                      disabled={isAdding || editingCertification !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {certification.issueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Issued: {formatDate(certification.issueDate)}
                      {certification.expirationDate && ` · Expires: ${formatDate(certification.expirationDate)}`}
                    </div>
                  )}
                </div>

                {certification.credentialUrl && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Credential
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
