"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Trophy, Calendar, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteAchievement } from "@/app/dashboard/profile/mutations/use-delete-achievement";
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { AchievementsForm } from "./achievements-form";
import type { AchievementResponse, CreateAchievementRequest } from "@/app/api/profile/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface AchievementsListProps {
  achievements: AchievementResponse[];
  isLoading: boolean;
}

export function AchievementsList({ achievements, isLoading }: AchievementsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementResponse | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null);

  const deleteMutation = useDeleteAchievement();
  const createMutation = useCreateAchievement();
  const pendingItems = useImportReviewStore((state) => state.achievements);
  const updatePendingItem = useImportReviewStore((state) => state.updateAchievementDraft);
  const removePendingItem = useImportReviewStore((state) => state.removeAchievementDraft);

  const startAdding = () => {
    setIsAdding(true);
    setEditingAchievement(null);
  };

  const startEditing = (achievement: AchievementResponse) => {
    setEditingAchievement(achievement);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingAchievement(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this achievement?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Achievement deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting achievement:", error);
          toast.error("Error deleting achievement. Please try again.");
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

  const handleSavePending = async (id: string, data: CreateAchievementRequest) => {
    setSavingPendingId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Achievement saved to your profile.");
    } catch (error) {
      console.error("Failed to save achievement:", error);
      toast.error("Failed to save achievement. Please try again.");
    } finally {
      setSavingPendingId(null);
    }
  };

  const handleUpdatePending = async (id: string, data: CreateAchievementRequest) => {
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
                Pending achievement draft{pendingItems.length === 1 ? "" : "s"}
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
                        {[item.request.title, item.request.organization]
                          .filter(Boolean)
                          .join(" · ") || "Pending achievement"}
                      </p>
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
                      <AchievementsForm
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
            <Trophy className="h-5 w-5" />
            Achievements & Awards
          </h2>
          <p className="text-sm text-muted-foreground">
            Highlight your notable achievements, awards, and recognitions
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingAchievement !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Achievement
        </Button>
      </div>

      {(isAdding || editingAchievement !== null) && (
        <AchievementsForm
          achievement={editingAchievement || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {achievements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No achievements added</h3>
              <p className="text-muted-foreground mb-4">
                Add your achievements, awards, and recognitions to stand out.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Achievement
              </Button>
            </CardContent>
          </Card>
        ) : (
          achievements.map((achievement) => (
            <Card key={achievement.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{achievement.title}</h3>
                    {achievement.organization && (
                      <p className="text-muted-foreground">{achievement.organization}</p>
                    )}
                    {achievement.date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(achievement.date)}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(achievement)}
                      disabled={isAdding || editingAchievement !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(achievement.id)}
                      disabled={isAdding || editingAchievement !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {achievement.description && (
                  <p className="text-sm mb-3 text-muted-foreground">
                    {achievement.description}
                  </p>
                )}

                {achievement.url && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={achievement.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
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
