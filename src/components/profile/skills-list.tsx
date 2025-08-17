"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Code } from "lucide-react";
import { useCreateSkill, useUpdateSkill, useDeleteSkill } from "@/hooks/use-profile";
import type { SkillResponse, CreateSkillRequest } from "@/lib/validators/profile.validator";

interface SkillsListProps {
  skills: SkillResponse[];
  isLoading: boolean;
}

const skillCategories = [
  { value: "technical", label: "Technical" },
  { value: "soft", label: "Soft Skills" },
  { value: "language", label: "Languages" },
  { value: "tool", label: "Tools" },
  { value: "framework", label: "Frameworks" },
  { value: "other", label: "Other" },
];

const proficiencyLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export function SkillsList({ skills, isLoading }: SkillsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "technical" as "technical" | "soft" | "language" | "tool" | "framework" | "other",
    proficiencyLevel: "" as "beginner" | "intermediate" | "advanced" | "expert" | "",
    yearsOfExperience: "",
  });
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();
  const deleteMutation = useDeleteSkill();

  const resetForm = () => {
    setFormData({
      name: "",
      category: "technical",
      proficiencyLevel: "",
      yearsOfExperience: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const startAdding = () => {
    resetForm();
    setIsAdding(true);
  };

  const startEditing = (skill: SkillResponse) => {
    setFormData({
      name: skill.name,
      category: skill.category,
      proficiencyLevel: skill.proficiencyLevel || "",
      yearsOfExperience: skill.yearsOfExperience?.toString() || "",
    });
    setEditingId(skill.id);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const submitData: CreateSkillRequest = {
      name: formData.name,
      category: formData.category,
      proficiencyLevel: formData.proficiencyLevel === "" ? null : formData.proficiencyLevel as "beginner" | "intermediate" | "advanced" | "expert",
      yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
      displayOrder: skills.length,
    };

    if (isAdding) {
      createMutation.mutate(submitData, {
        onSuccess: () => resetForm(),
        onError: (error) => {
          console.error("Error saving skill:", error);
          alert("Error saving skill. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData }, {
        onSuccess: () => resetForm(),
        onError: (error) => {
          console.error("Error saving skill:", error);
          alert("Error saving skill. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this skill?")) {
      deleteMutation.mutate(id);
    }
  };

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillResponse[]>);

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-4">
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
        <Button onClick={startAdding} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Skill
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add Skill" : "Edit Skill"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Skill Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="React"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as "technical" | "soft" | "language" | "tool" | "framework" | "other" }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    {skillCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proficiencyLevel">Proficiency Level</Label>
                  <select
                    id="proficiencyLevel"
                    value={formData.proficiencyLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, proficiencyLevel: e.target.value as "" | "beginner" | "intermediate" | "advanced" | "expert" }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select level</option>
                    {proficiencyLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    value={formData.yearsOfExperience}
                    onChange={(e) => setFormData(prev => ({ ...prev, yearsOfExperience: e.target.value }))}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : isAdding ? "Add Skill" : "Update Skill"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                  {categorySkills.map((skill) => (
                    <div key={skill.id} className="group relative">
                      <Badge variant="secondary" className="pr-8">
                        {skill.name}
                        {skill.proficiencyLevel && ` (${skill.proficiencyLevel})`}
                      </Badge>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => startEditing(skill)}
                          className="w-4 h-4 hover:bg-gray-200 rounded flex items-center justify-center"
                          disabled={isAdding || editingId !== null}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="w-4 h-4 hover:bg-red-200 rounded flex items-center justify-center"
                          disabled={isAdding || editingId !== null}
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