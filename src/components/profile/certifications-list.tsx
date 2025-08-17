"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Plus } from "lucide-react";
import type { CertificationResponse } from "@/lib/validators/profile.validator";

interface CertificationsListProps {
  certifications: CertificationResponse[];
  isLoading: boolean;
}

export function CertificationsList({ certifications: _certifications, isLoading }: CertificationsListProps) {
  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
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
            Add your professional certifications
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Certification
        </Button>
      </div>

      <Card>
        <CardContent className="py-8 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Certifications component coming soon</h3>
          <p className="text-muted-foreground">
            This component will be implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}