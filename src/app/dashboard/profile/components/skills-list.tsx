"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Code, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteSkill } from "@/app/dashboard/profile/mutations/use-delete-skill";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { SkillForm } from "./skills-form";
import type { SkillResponse, CreateSkillRequest } from "@/app/api/profile/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface SkillsListProps {
  skills: SkillResponse[];
  isLoading: boolean;
}

export function SkillsList({ skills, isLoading }: SkillsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillResponse | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [savingPendingId, setSavingPendingId] = useState<string | null>(null);

  const deleteMutation = useDeleteSkill();
  const createMutation = useCreateSkill();
  const pendingItems = useImportReviewStore((state) => state.skills);
  const updatePendingItem = useImportReviewStore((state) => state.updateSkillDraft);
  const removePendingItem = useImportReviewStore((state) => state.removeSkillDraft);

  const startAdding = () => {
    setIsAdding(true);
    setEditingSkill(null);
  };

  const startEditing = (skill: SkillResponse) => {
    setEditingSkill(skill);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingSkill(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this skill?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Skill deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting skill:", error);
          toast.error("Error deleting skill. Please try again.");
        },
      });
    }
  };

  const handleSavePending = async (id: string, data: CreateSkillRequest) => {
    setSavingPendingId(id);
    try {
      await createMutation.mutateAsync(data);
      removePendingItem(id);
      toast.success("Skill saved to your profile.");
    } catch (error) {
      console.error("Failed to save skill:", error);
      toast.error("Failed to save skill. Please try again.");
    } finally {
      setSavingPendingId(null);
    }
  };

  const handleUpdatePending = async (id: string, data: CreateSkillRequest) => {
    updatePendingItem(id, data);
    toast.success("Draft updated.");
  };

  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillResponse[]>);

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
                Pending skill draft{pendingItems.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-primary/80">
                Review, edit, or save these entries individually.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {pendingItems.map((item) => (
                <div key={item.id} className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {item.request.name} ({item.request.category})
                      </p>
                      {item.request.proficiencyLevel && (
                        <p className="text-xs text-primary/80">
                          Level: {item.request.proficiencyLevel}
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
                      <SkillForm
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
            <Code className="h-5 w-5" />
            Skills
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your technical and soft skills
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingSkill !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Skill
        </Button>
      </div>

      {(isAdding || editingSkill !== null) && (
        <SkillForm
          skill={editingSkill || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {skills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills added</h3>
              <p className="text-muted-foreground mb-4">
                Add your skills to showcase your expertise.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Skill
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(skillsByCategory).map(([category, categorySkills]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category} Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skillItem) => (
                    <div key={skillItem.id} className="group relative">
                      <Badge variant="secondary" className="pr-8">
                        {skillItem.name}
                        {skillItem.proficiencyLevel && ` (${skillItem.proficiencyLevel})`}
                      </Badge>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => startEditing(skillItem)}
                          className="w-4 h-4 hover:bg-gray-200 rounded flex items-center justify-center"
                          disabled={isAdding || editingSkill !== null}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(skillItem.id)}
                          className="w-4 h-4 hover:bg-red-200 rounded flex items-center justify-center"
                          disabled={isAdding || editingSkill !== null}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
