"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Save, X, GraduationCap, Calendar, MapPin } from "lucide-react";
import { 
  useCreateEducation, 
  useUpdateEducation, 
  useDeleteEducation 
} from "@/hooks/use-profile";
import type { 
  EducationResponse, 
  CreateEducationRequest
} from "@/lib/validators/profile.validator";

interface EducationListProps {
  education: EducationResponse[];
  isLoading: boolean;
}

interface EducationFormData {
  degree: string;
  fieldOfStudy: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
  honors: string;
  relevantCoursework: string;
  displayOrder: number;
}

const emptyFormData: EducationFormData = {
  degree: "",
  fieldOfStudy: "",
  institution: "",
  location: "",
  startDate: "",
  endDate: "",
  gpa: "",
  honors: "",
  relevantCoursework: "",
  displayOrder: 0,
};

export function EducationList({ education, isLoading }: EducationListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EducationFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateEducation();
  const updateMutation = useUpdateEducation();
  const deleteMutation = useDeleteEducation();

  const handleChange = (field: keyof EducationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startAdding = () => {
    setFormData({ ...emptyFormData, displayOrder: education.length });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEditing = (edu: EducationResponse) => {
    setFormData({
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy || "",
      institution: edu.institution,
      location: edu.location || "",
      startDate: edu.startDate || "",
      endDate: edu.endDate || "",
      gpa: edu.gpa || "",
      honors: edu.honors || "",
      relevantCoursework: edu.relevantCoursework || "",
      displayOrder: edu.displayOrder,
    });
    setEditingId(edu.id);
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

    const submitData: CreateEducationRequest = {
      degree: formData.degree,
      fieldOfStudy: formData.fieldOfStudy || null,
      institution: formData.institution,
      location: formData.location || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      gpa: formData.gpa || null,
      honors: formData.honors || null,
      relevantCoursework: formData.relevantCoursework || null,
      displayOrder: formData.displayOrder,
    };

    if (isAdding) {
      createMutation.mutate(submitData, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error creating education:", error);
          alert("Error creating education. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData }, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error updating education:", error);
          alert("Error updating education. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this education entry?")) {
      deleteMutation.mutate(id, {
        onError: (error) => {
          console.error("Error deleting education:", error);
          alert("Error deleting education. Please try again.");
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
            <GraduationCap className="h-5 w-5" />
            Education
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your educational background
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Education
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add Education" : "Edit Education"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="degree">Degree *</Label>
                  <Input
                    id="degree"
                    value={formData.degree}
                    onChange={(e) => handleChange("degree", e.target.value)}
                    placeholder="Bachelor of Science"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fieldOfStudy">Field of Study</Label>
                  <Input
                    id="fieldOfStudy"
                    value={formData.fieldOfStudy}
                    onChange={(e) => handleChange("fieldOfStudy", e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institution">Institution *</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => handleChange("institution", e.target.value)}
                    placeholder="University of California"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Berkeley, CA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="month"
                    value={formData.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="month"
                    value={formData.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gpa">GPA</Label>
                  <Input
                    id="gpa"
                    value={formData.gpa}
                    onChange={(e) => handleChange("gpa", e.target.value)}
                    placeholder="3.8/4.0"
                  />
                </div>
                <div>
                  <Label htmlFor="honors">Honors</Label>
                  <Input
                    id="honors"
                    value={formData.honors}
                    onChange={(e) => handleChange("honors", e.target.value)}
                    placeholder="Magna Cum Laude"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="relevantCoursework">Relevant Coursework</Label>
                <Textarea
                  id="relevantCoursework"
                  value={formData.relevantCoursework}
                  onChange={(e) => handleChange("relevantCoursework", e.target.value)}
                  placeholder="Data Structures, Algorithms, Software Engineering..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : isAdding ? "Add Education" : "Update Education"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                      disabled={isAdding || editingId !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(edu.id)}
                      disabled={isAdding || editingId !== null}
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