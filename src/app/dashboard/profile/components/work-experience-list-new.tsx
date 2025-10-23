"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Briefcase, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useDeleteWorkExperience } from "@/app/dashboard/profile/mutations/use-delete-work-experience";
import { WorkExperienceForm } from "./work-experience-form";
import type { WorkExperienceResponse } from "@/app/api/profile/validators";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface WorkExperienceListProps {
  experiences: WorkExperienceResponse[];
  isLoading: boolean;
}

export function WorkExperienceList({ experiences, isLoading }: WorkExperienceListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingExperience, setEditingExperience] = useState<WorkExperienceResponse | null>(null);
  const deleteMutation = useDeleteWorkExperience();

  const startAdding = () => {
    setIsAdding(true);
    setEditingExperience(null);
  };

  const startEditing = (experience: WorkExperienceResponse) => {
    setEditingExperience(experience);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingExperience(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this work experience?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Work experience deleted successfully!");
        },
        onError: (error) => {
          console.error("Error deleting work experience:", error);
          toast.error("Error deleting work experience. Please try again.");
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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ProfileItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Work Experience
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your professional work experience
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingExperience !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Experience
        </Button>
      </div>

      {(isAdding || editingExperience) && (
        <WorkExperienceForm
          experience={editingExperience || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
      )}

      <div className="space-y-4">
        {experiences.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No work experience added</h3>
              <p className="text-muted-foreground mb-4">
                Add your work experience to build your professional profile.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Experience
              </Button>
            </CardContent>
          </Card>
        ) : (
          experiences.map((experience) => (
            <Card key={experience.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{experience.jobTitle}</h3>
                    <p className="text-muted-foreground">{experience.company}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(experience)}
                      disabled={isAdding || editingExperience !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(experience.id)}
                      disabled={isAdding || editingExperience !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(experience.startDate)} - {experience.isCurrent ? "Present" : formatDate(experience.endDate || "")}
                  </div>
                  {experience.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {experience.location}
                    </div>
                  )}
                </div>

                {experience.description && (
                  <p className="text-sm mb-3 whitespace-pre-wrap">{experience.description}</p>
                )}

                {experience.technologies && (
                  <div className="flex flex-wrap gap-2">
                    {experience.technologies.split(",").map((tech, index) => (
                      <Badge key={index} variant="secondary">
                        {tech.trim()}
                      </Badge>
                    ))}
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