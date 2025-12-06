"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, GraduationCap, Calendar, MapPin, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteEducation } from "@/app/dashboard/profile/mutations/use-delete-education";
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { EducationForm } from "./education-form";
import type { EducationResponse, CreateEducationRequest } from "@/app/api/profile/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface EducationListProps {
  education: EducationResponse[];
  isLoading: boolean;
}

export function EducationList({ education, isLoading }: EducationListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEducation, setEditingEducation] = useState<EducationResponse | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null);

  const deleteMutation = useDeleteEducation();
  const createMutation = useCreateEducation();
  const pendingItems = useImportReviewStore((state) => state.education);
  const updatePendingItem = useImportReviewStore((state) => state.updateEducationDraft);
  const removePendingItem = useImportReviewStore((state) => state.removeEducationDraft);

  const startAdding = () => {
    setIsAdding(true);
    setEditingEducation(null);
  };

  const startEditing = (edu: EducationResponse) => {
    setEditingEducation(edu);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingEducation(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this education entry?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Education deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting education:", error);
          toast.error("Error deleting education. Please try again.");
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

  const handleSavePending = async (id: string, data: CreateEducationRequest) => {
    setSavingPendingId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Education saved to your profile.");
    } catch (error) {
      console.error("Failed to save education:", error);
      toast.error("Failed to save education. Please try again.");
    } finally {
      setSavingPendingId(null);
    }
  };

  const handleUpdatePending = async (id: string, data: CreateEducationRequest) => {
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
                Pending education draft{pendingItems.length === 1 ? "" : "s"}
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
                        {[item.request.degree, item.request.institution]
                          .filter(Boolean)
                          .join(" · ") || "Pending education"}
                      </p>
                      {item.request.fieldOfStudy && (
                        <p className="text-xs text-primary/80">{item.request.fieldOfStudy}</p>
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
                      <EducationForm
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
            <GraduationCap className="h-5 w-5" />
            Education
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your educational background
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingEducation !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Education
        </Button>
      </div>

      {(isAdding || editingEducation !== null) && (
        <EducationForm
          education={editingEducation || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {education.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No education added</h3>
              <p className="text-muted-foreground mb-4">
                Add your educational background to complete your profile.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Education
              </Button>
            </CardContent>
          </Card>
        ) : (
          education.map((edu) => (
            <Card key={edu.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{edu.degree}</h3>
                    {edu.fieldOfStudy && <p className="text-muted-foreground">{edu.fieldOfStudy}</p>}
                    <p className="font-medium">{edu.institution}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(edu)}
                      disabled={isAdding || editingEducation !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(edu.id)}
                      disabled={isAdding || editingEducation !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {(edu.startDate || edu.endDate) && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                    </div>
                  )}
                  {edu.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {edu.location}
                    </div>
                  )}
                </div>

                {(edu.gpa || edu.honors) && (
                  <div className="flex gap-4 text-sm mb-2">
                    {edu.gpa && <span><strong>GPA:</strong> {edu.gpa}</span>}
                    {edu.honors && <span><strong>Honors:</strong> {edu.honors}</span>}
                  </div>
                )}

                {edu.relevantCoursework && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Relevant coursework:</strong> {edu.relevantCoursework}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
