"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Save, X, Users, Mail, Phone } from "lucide-react";
import { useCreateReference, useUpdateReference, useDeleteReference } from "@/hooks/use-profile";
import type { ReferenceResponse, CreateReferenceRequest } from "@/lib/validators/profile.validator";

interface ReferencesListProps {
  references: ReferenceResponse[];
  isLoading: boolean;
}

interface ReferenceFormData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
  displayOrder: number;
}

const emptyFormData: ReferenceFormData = {
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  relationship: "",
  displayOrder: 0,
};

export function ReferencesList({ references, isLoading }: ReferencesListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ReferenceFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateReference();
  const updateMutation = useUpdateReference();
  const deleteMutation = useDeleteReference();

  const handleChange = (field: keyof ReferenceFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startAdding = () => {
    setFormData({ ...emptyFormData, displayOrder: references.length });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEditing = (reference: ReferenceResponse) => {
    setFormData({
      name: reference.name,
      title: reference.title || "",
      company: reference.company || "",
      email: reference.email || "",
      phone: reference.phone || "",
      relationship: reference.relationship || "",
      displayOrder: reference.displayOrder,
    });
    setEditingId(reference.id);
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

    const submitData: CreateReferenceRequest = {
      name: formData.name,
      title: formData.title || null,
      company: formData.company || null,
      email: formData.email || null,
      phone: formData.phone || null,
      relationship: formData.relationship === "" ? null : formData.relationship as "manager" | "colleague" | "client" | "professor" | "mentor" | "other",
      displayOrder: formData.displayOrder,
    };

    if (isAdding) {
      createMutation.mutate(submitData, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error creating reference:", error);
          alert("Error creating reference. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData }, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error updating reference:", error);
          alert("Error updating reference. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this reference?")) {
      deleteMutation.mutate(id, {
        onError: (error) => {
          console.error("Error deleting reference:", error);
          alert("Error deleting reference. Please try again.");
        },
      });
    }
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
            <Users className="h-5 w-5" />
            Professional References
          </h2>
          <p className="text-sm text-muted-foreground">
            Add professional references who can vouch for your work
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reference
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add Reference" : "Edit Reference"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Senior Software Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    placeholder="Tech Corp"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <select
                  id="relationship"
                  value={formData.relationship}
                  onChange={(e) => handleChange("relationship", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select relationship</option>
                  <option value="manager">Manager</option>
                  <option value="colleague">Colleague</option>
                  <option value="client">Client</option>
                  <option value="professor">Professor</option>
                  <option value="mentor">Mentor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="john.smith@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : isAdding ? "Add Reference" : "Update Reference"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {references.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No references added</h3>
              <p className="text-muted-foreground mb-4">
                Add professional references to strengthen your profile.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Reference
              </Button>
            </CardContent>
          </Card>
        ) : (
          references.map((reference) => (
            <Card key={reference.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{reference.name}</h3>
                    {reference.title && reference.company && (
                      <p className="text-muted-foreground">
                        {reference.title} at {reference.company}
                      </p>
                    )}
                    {reference.relationship && (
                      <p className="text-sm text-muted-foreground">
                        Relationship: {reference.relationship}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(reference)}
                      disabled={isAdding || editingId !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(reference.id)}
                      disabled={isAdding || editingId !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {reference.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${reference.email}`} className="hover:underline">
                        {reference.email}
                      </a>
                    </div>
                  )}
                  {reference.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${reference.phone}`} className="hover:underline">
                        {reference.phone}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}