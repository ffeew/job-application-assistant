"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useApplication, useUpdateApplication } from "@/hooks/use-applications";

export default function EditApplicationPage({ params }: { params: { id: string } }) {
  const [formData, setFormData] = useState({
    company: "",
    position: "",
    jobDescription: "",
    location: "",
    jobUrl: "",
    salaryRange: "",
    status: "applied",
    appliedAt: "",
    notes: "",
    contactEmail: "",
    contactName: "",
    recruiterId: "",
  });
  const router = useRouter();
  const { data: application, isLoading, error } = useApplication(params.id);
  const updateApplicationMutation = useUpdateApplication();

  useEffect(() => {
    if (application) {
      setFormData({
        company: application.company || "",
        position: application.position || "",
        jobDescription: application.jobDescription || "",
        location: application.location || "",
        jobUrl: application.jobUrl || "",
        salaryRange: application.salaryRange || "",
        status: application.status || "applied",
        appliedAt: application.appliedAt ? 
          new Date(application.appliedAt).toISOString().split('T')[0] : "",
        notes: application.notes || "",
        contactEmail: application.contactEmail || "",
        contactName: application.contactName || "",
        recruiterId: application.recruiterId || "",
      });
    }
  }, [application]);

  useEffect(() => {
    if (error) {
      router.push("/dashboard/applications");
    }
  }, [error, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company.trim() || !formData.position.trim()) {
      alert("Company and position are required");
      return;
    }

    updateApplicationMutation.mutate(
      { id: params.id, data: formData },
      {
        onSuccess: () => {
          router.push("/dashboard/applications");
        },
        onError: (error) => {
          console.error("Error updating application:", error);
          alert("Error updating application. Please try again.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Application</h1>
          <p className="text-muted-foreground">
            Update your job application details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Basic information about the job opportunity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Software Engineer"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="interviewing">Interviewing</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="appliedAt">Application Date</Label>
                  <Input
                    id="appliedAt"
                    type="date"
                    value={formData.appliedAt}
                    onChange={(e) => handleInputChange("appliedAt", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this application..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/applications">Cancel</Link>
            </Button>
            <Button type="submit" disabled={updateApplicationMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateApplicationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}