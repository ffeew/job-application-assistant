"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Save, X, Trophy, Calendar, ExternalLink } from "lucide-react";
import { useCreateAchievement, useUpdateAchievement, useDeleteAchievement } from "@/hooks/use-profile";
import type { AchievementResponse, CreateAchievementRequest } from "@/lib/validators/profile.validator";

interface AchievementsListProps {
  achievements: AchievementResponse[];
  isLoading: boolean;
}

interface AchievementFormData {
  title: string;
  description: string;
  date: string;
  organization: string;
  url: string;
  displayOrder: number;
}

const emptyFormData: AchievementFormData = {
  title: "",
  description: "",
  date: "",
  organization: "",
  url: "",
  displayOrder: 0,
};

export function AchievementsList({ achievements, isLoading }: AchievementsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AchievementFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateAchievement();
  const updateMutation = useUpdateAchievement();
  const deleteMutation = useDeleteAchievement();

  const handleChange = (field: keyof AchievementFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startAdding = () => {
    setFormData({ ...emptyFormData, displayOrder: achievements.length });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEditing = (achievement: AchievementResponse) => {
    setFormData({
      title: achievement.title,
      description: achievement.description || "",
      date: achievement.date || "",
      organization: achievement.organization || "",
      url: achievement.url || "",
      displayOrder: achievement.displayOrder,
    });
    setEditingId(achievement.id);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const submitData: CreateAchievementRequest = {
      title: formData.title,
      description: formData.description || null,
      date: formData.date || null,
      organization: formData.organization || null,
      url: formData.url || null,
      displayOrder: formData.displayOrder,
    };

    if (isAdding) {
      createMutation.mutate(submitData, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error creating achievement:", error);
          alert("Error creating achievement. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData }, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error updating achievement:", error);
          alert("Error updating achievement. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this achievement?")) {
      deleteMutation.mutate(id, {
        onError: (error) => {
          console.error("Error deleting achievement:", error);
          alert("Error deleting achievement. Please try again.");
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
        <Button onClick={startAdding} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Achievement
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add Achievement" : "Edit Achievement"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Achievement Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Employee of the Year"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Describe the achievement, what it recognizes, and its significance..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date Received</Label>
                  <Input
                    id="date"
                    type="month"
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="organization">Awarding Organization</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => handleChange("organization", e.target.value)}
                    placeholder="Company Name, Institution, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="url">Related URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleChange("url", e.target.value)}
                  placeholder="https://example.com/award-details"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : isAdding ? "Add Achievement" : "Update Achievement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                      disabled={isAdding || editingId !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(achievement.id)}
                      disabled={isAdding || editingId !== null}
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