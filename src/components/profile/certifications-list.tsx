"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Save, X, Award, Calendar, ExternalLink } from "lucide-react";
import { useCreateCertification, useUpdateCertification, useDeleteCertification } from "@/hooks/use-profile";
import type { CertificationResponse, CreateCertificationRequest } from "@/lib/validators/profile.validator";

interface CertificationsListProps {
  certifications: CertificationResponse[];
  isLoading: boolean;
}

interface CertificationFormData {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
  displayOrder: number;
}

const emptyFormData: CertificationFormData = {
  name: "",
  issuingOrganization: "",
  issueDate: "",
  expirationDate: "",
  credentialId: "",
  credentialUrl: "",
  displayOrder: 0,
};

export function CertificationsList({ certifications, isLoading }: CertificationsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CertificationFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateCertification();
  const updateMutation = useUpdateCertification();
  const deleteMutation = useDeleteCertification();

  const handleChange = (field: keyof CertificationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startAdding = () => {
    setFormData({ ...emptyFormData, displayOrder: certifications.length });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEditing = (certification: CertificationResponse) => {
    setFormData({
      name: certification.name,
      issuingOrganization: certification.issuingOrganization,
      issueDate: certification.issueDate || "",
      expirationDate: certification.expirationDate || "",
      credentialId: certification.credentialId || "",
      credentialUrl: certification.credentialUrl || "",
      displayOrder: certification.displayOrder,
    });
    setEditingId(certification.id);
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

    const submitData: CreateCertificationRequest = {
      name: formData.name,
      issuingOrganization: formData.issuingOrganization,
      issueDate: formData.issueDate || null,
      expirationDate: formData.expirationDate || null,
      credentialId: formData.credentialId || null,
      credentialUrl: formData.credentialUrl || null,
      displayOrder: formData.displayOrder,
    };

    if (isAdding) {
      createMutation.mutate(submitData, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error creating certification:", error);
          alert("Error creating certification. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData }, {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          console.error("Error updating certification:", error);
          alert("Error updating certification. Please try again.");
        },
        onSettled: () => setSaving(false),
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this certification?")) {
      deleteMutation.mutate(id, {
        onError: (error) => {
          console.error("Error deleting certification:", error);
          alert("Error deleting certification. Please try again.");
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
            <Award className="h-5 w-5" />
            Certifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your professional certifications and credentials
          </p>
        </div>
        <Button onClick={startAdding} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certification
        </Button>
      </div>

      {(isAdding || editingId !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? "Add Certification" : "Edit Certification"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Certification Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="AWS Certified Solutions Architect"
                  required
                />
              </div>

              <div>
                <Label htmlFor="issuingOrganization">Issuing Organization *</Label>
                <Input
                  id="issuingOrganization"
                  value={formData.issuingOrganization}
                  onChange={(e) => handleChange("issuingOrganization", e.target.value)}
                  placeholder="Amazon Web Services"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="month"
                    value={formData.issueDate}
                    onChange={(e) => handleChange("issueDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="expirationDate">Expiration Date</Label>
                  <Input
                    id="expirationDate"
                    type="month"
                    value={formData.expirationDate}
                    onChange={(e) => handleChange("expirationDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credentialId">Credential ID</Label>
                  <Input
                    id="credentialId"
                    value={formData.credentialId}
                    onChange={(e) => handleChange("credentialId", e.target.value)}
                    placeholder="ABC123DEF456"
                  />
                </div>
                <div>
                  <Label htmlFor="credentialUrl">Credential URL</Label>
                  <Input
                    id="credentialUrl"
                    type="url"
                    value={formData.credentialUrl}
                    onChange={(e) => handleChange("credentialUrl", e.target.value)}
                    placeholder="https://www.credly.com/badges/..."
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
                  {saving ? "Saving..." : isAdding ? "Add Certification" : "Update Certification"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {certifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No certifications added</h3>
              <p className="text-muted-foreground mb-4">
                Add your professional certifications to showcase your expertise.
              </p>
              <Button onClick={startAdding}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Certification
              </Button>
            </CardContent>
          </Card>
        ) : (
          certifications.map((certification) => (
            <Card key={certification.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{certification.name}</h3>
                    <p className="text-muted-foreground">{certification.issuingOrganization}</p>
                    {certification.credentialId && (
                      <p className="text-sm text-muted-foreground">ID: {certification.credentialId}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(certification)}
                      disabled={isAdding || editingId !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(certification.id)}
                      disabled={isAdding || editingId !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {certification.issueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Issued: {formatDate(certification.issueDate)}
                      {certification.expirationDate && ` - Expires: ${formatDate(certification.expirationDate)}`}
                    </div>
                  )}
                </div>

                {certification.credentialUrl && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Credential
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