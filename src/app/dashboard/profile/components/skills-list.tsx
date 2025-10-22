"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Code } from "lucide-react";
import { toast } from "sonner";
import { useDeleteSkill } from "@/app/dashboard/profile/mutations/use-delete-skill";
import { SkillForm } from "./skills-form";
import type { SkillResponse } from "@/app/api/profile/validators";

interface SkillsListProps {
  skills: SkillResponse[];
  isLoading: boolean;
}


export function SkillsList({ skills, isLoading }: SkillsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillResponse | null>(null);

  const deleteMutation = useDeleteSkill();

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
                          disabled={isAdding || editingSkill !== null}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id)}
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