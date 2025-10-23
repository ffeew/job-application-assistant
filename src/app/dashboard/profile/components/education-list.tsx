"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, GraduationCap, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useDeleteEducation } from "@/app/dashboard/profile/mutations/use-delete-education";
import { EducationForm } from "./education-form";
import type { EducationResponse } from "@/app/api/profile/validators";
import { ProfileItemSkeleton } from "./profile-item-skeleton";

interface EducationListProps {
  education: EducationResponse[];
  isLoading: boolean;
}


export function EducationList({ education, isLoading }: EducationListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEducation, setEditingEducation] = useState<EducationResponse | null>(null);

  const deleteMutation = useDeleteEducation();

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
                      {formatDate(edu.startDate || "")} - {formatDate(edu.endDate || "")}
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
                  <div className="text-sm">
                    <strong>Relevant Coursework:</strong> {edu.relevantCoursework}
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