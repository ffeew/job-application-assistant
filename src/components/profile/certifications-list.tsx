"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Award, Calendar, ExternalLink } from "lucide-react";
import { useDeleteCertification } from "@/hooks/use-profile";
import { CertificationsForm } from "./certifications-form";
import type { CertificationResponse } from "@/lib/validators/profile.validator";

interface CertificationsListProps {
  certifications: CertificationResponse[];
  isLoading: boolean;
}


export function CertificationsList({ certifications, isLoading }: CertificationsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCertification, setEditingCertification] = useState<CertificationResponse | null>(null);

  const deleteMutation = useDeleteCertification();

  const startAdding = () => {
    setIsAdding(true);
    setEditingCertification(null);
  };

  const startEditing = (certification: CertificationResponse) => {
    setEditingCertification(certification);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setIsAdding(false);
    setEditingCertification(null);
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
        <Button onClick={startAdding} disabled={isAdding || editingCertification !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certification
        </Button>
      </div>

      {(isAdding || editingCertification !== null) && (
        <CertificationsForm
          certification={editingCertification || undefined}
          onCancel={cancelEditing}
          onSuccess={cancelEditing}
        />
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
                      disabled={isAdding || editingCertification !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(certification.id)}
                      disabled={isAdding || editingCertification !== null}
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