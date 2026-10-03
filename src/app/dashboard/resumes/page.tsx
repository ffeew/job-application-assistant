"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { Plus, FileText, Edit, Trash2, Star, Wand2, Target, ChevronRight } from "lucide-react";
import { useResumes } from "@/app/dashboard/resumes/queries/use-resumes";
import { useDeleteResume } from "@/app/dashboard/resumes/mutations/use-delete-resume";
import { useUpdateResume } from "@/app/dashboard/resumes/mutations/use-update-resume";
import { toast } from "sonner";
import { ResumesListSkeleton } from "./components/resumes-list-skeleton";

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
      toast.success("Resume deleted successfully!");
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume. Please try again.");
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
          content: resume.content,
          isDefault: !resume.isDefault,
        }
      });
      toast.success(resume.isDefault ? "Default resume removed" : "Set as default resume");
    } catch (error) {
      console.error("Error updating resume:", error);
      toast.error("Failed to update resume. Please try again.");
    }
  };

  if (isLoading) {
    return <ResumesListSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumes</h1>
          <p className="text-muted-foreground">
            Manage your resumes and create tailored versions for different applications.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/resumes/generate">
              <Wand2 className="mr-2 h-4 w-4" />
              Generate from Profile
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/resumes/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Manual
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Looking to create a tailored resume for a job application?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Visit the{" "}
                <Link
                  href="/dashboard/applications"
                  className="underline font-medium hover:text-blue-900 dark:hover:text-blue-100"
                >
                  Applications
                </Link>{" "}
                page to generate an AI-optimized resume based on a specific job description.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Create your first resume to get started with your job applications.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/resumes/generate">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate from Profile
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/resumes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Manual Resume
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveList
          items={resumes}
          getItemId={(resume) => resume.id}
          renderMobileHeader={(resume) => (
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {resume.title}
                  {resume.isDefault && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Updated {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          )}
          renderMobileContent={(resume) => (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
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
          )}
          renderDesktopCard={(resume) => (
            <Card className="relative">
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
                <div className="flex items-center gap-2">
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
          )}
        />
      )}
    </div>
  );
}