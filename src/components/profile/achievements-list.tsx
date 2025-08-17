"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Trophy, Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useDeleteAchievement } from "@/hooks/use-profile";
import { AchievementsForm } from "./achievements-form";
import type { AchievementResponse } from "@/lib/validators/profile.validator";

interface AchievementsListProps {
  achievements: AchievementResponse[];
  isLoading: boolean;
}


export function AchievementsList({ achievements, isLoading }: AchievementsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementResponse | null>(null);

  const deleteMutation = useDeleteAchievement();

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

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month] = dateString.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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