"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Users, Mail, Phone, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteReference } from "@/app/dashboard/profile/mutations/use-delete-reference";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";
import { ReferencesForm } from "./references-form";
import type { ReferenceResponse, CreateReferenceRequest } from "@/app/api/profile/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface ReferencesListProps {
  references: ReferenceResponse[];
  isLoading: boolean;
}

export function ReferencesList({ references, isLoading }: ReferencesListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingReference, setEditingReference] = useState<ReferenceResponse | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null);

  const deleteMutation = useDeleteReference();
  const createMutation = useCreateReference();
  const pendingItems = useImportReviewStore((state) => state.references);
  const updatePendingItem = useImportReviewStore((state) => state.updateReferenceDraft);
  const removePendingItem = useImportReviewStore((state) => state.removeReferenceDraft);

  const startAdding = () => {
    setIsAdding(true);
    setEditingReference(null);
  };

  const startEditing = (reference: ReferenceResponse) => {
    setEditingReference(reference);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingReference(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this reference?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Reference deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting reference:", error);
          toast.error("Error deleting reference. Please try again.");
        },
      });
    }
  };

  const handleSavePending = async (id: string, data: CreateReferenceRequest) => {
    setSavingPendingId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Reference saved to your profile.");
    } catch (error) {
      console.error("Failed to save reference:", error);
      toast.error("Failed to save reference. Please try again.");
    } finally {
      setSavingPendingId(null);
    }
  };

  const handleUpdatePending = async (id: string, data: CreateReferenceRequest) => {
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
                Pending reference draft{pendingItems.length === 1 ? "" : "s"}
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
                      <p className="font-semibold">{item.request.name}</p>
                      {[item.request.title, item.request.company]
                        .filter(Boolean)
                        .join(" · ") && (
                        <p className="text-xs text-primary/80">
                          {[item.request.title, item.request.company]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
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
                      <ReferencesForm
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
            <Users className="h-5 w-5" />
            Professional References
          </h2>
          <p className="text-sm text-muted-foreground">
            Add professional references who can vouch for your work
          </p>
        </div>
        <Button
          onClick={startAdding}
          disabled={isAdding || editingReference !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Reference
        </Button>
      </div>

      {(isAdding || editingReference !== null) && (
        <ReferencesForm
          reference={editingReference || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {references.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No references added
              </h3>
              <p className="text-muted-foreground mb-4">
                Add professional references to strengthen your profile.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Reference
              </Button>
            </CardContent>
          </Card>
        ) : (
          references.map((reference) => (
            <Card key={reference.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{reference.name}</h3>
                    {reference.title && reference.company && (
                      <p className="text-muted-foreground">
                        {reference.title} at {reference.company}
                      </p>
                    )}
                    {reference.relationship && (
                      <p className="text-sm text-muted-foreground">
                        Relationship: {reference.relationship}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(reference)}
                      disabled={isAdding || editingReference !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(reference.id)}
                      disabled={isAdding || editingReference !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {reference.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${reference.email}`}
                        className="hover:underline"
                      >
                        {reference.email}
                      </a>
                    </div>
                  )}
                  {reference.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`tel:${reference.phone}`}
                        className="hover:underline"
                      >
                        {reference.phone}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
