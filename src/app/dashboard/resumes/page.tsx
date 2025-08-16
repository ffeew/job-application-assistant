"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Edit, Trash2, Star } from "lucide-react";
import { useResumes, useDeleteResume, useUpdateResume } from "@/hooks";
import type { ResumeContent } from "@/lib/api";

export default function ResumesPage() {
  const { data: resumes = [], isLoading } = useResumes();
  const deleteResumeMutation = useDeleteResume();
  const updateResumeMutation = useUpdateResume();

  const handleDeleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) {
      return;
    }

    try {
      await deleteResumeMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting resume:", error);
      alert("Failed to delete resume. Please try again.");
    }
  };

  const toggleDefault = async (id: string) => {
    try {
      const resume = resumes.find(r => r.id === id);
      if (!resume) return;

      await updateResumeMutation.mutateAsync({
        id,
        data: {
          title: resume.title,
          content: JSON.parse(resume.content) as ResumeContent,
          isDefault: !resume.isDefault,
        }
      });
    } catch (error) {
      console.error("Error updating resume:", error);
      alert("Failed to update resume. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Loading resumes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumes</h1>
          <p className="text-muted-foreground">
            Manage your resumes and create tailored versions for different applications.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/resumes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Resume
          </Link>
        </Button>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Create your first resume to get started with your job applications.
            </p>
            <Button asChild>
              <Link href="/dashboard/resumes/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Resume
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card key={resume.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center">
                      {resume.title}
                      {resume.isDefault && (
                        <Star className="ml-2 h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Updated {new Date(resume.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/resumes/${resume.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant={resume.isDefault ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDefault(resume.id)}
                    disabled={updateResumeMutation.isPending}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {resume.isDefault ? "Default" : "Set Default"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteResume(resume.id)}
                    disabled={deleteResumeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}