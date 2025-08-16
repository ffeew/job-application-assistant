"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, PenTool, Eye, Trash2, Sparkles } from "lucide-react";
import { useCoverLetters, useDeleteCoverLetter } from "@/hooks/use-cover-letters";
import type { CoverLetter } from "@/lib/api/types";

export default function CoverLettersPage() {
  const { data: coverLetters = [], isLoading, error, refetch } = useCoverLetters();
  const deleteCoverLetterMutation = useDeleteCoverLetter();

  const handleDeleteCoverLetter = (id: string) => {
    if (!confirm("Are you sure you want to delete this cover letter?")) {
      return;
    }
    deleteCoverLetterMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Loading cover letters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="text-lg text-red-600">Error loading cover letters</div>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cover Letters</h1>
          <p className="text-muted-foreground">
            Create and manage your cover letters. Use AI to generate personalized letters for your applications.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cover-letters/new">
            <Plus className="mr-2 h-4 w-4" />
            Generate Cover Letter
          </Link>
        </Button>
      </div>

      {coverLetters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PenTool className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No cover letters yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Generate your first AI-powered cover letter to make your job applications stand out.
            </p>
            <Button asChild>
              <Link href="/dashboard/cover-letters/new">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Your First Cover Letter
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coverLetters.map((letter) => (
            <Card key={letter.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center">
                      {letter.title}
                      {letter.isAiGenerated && (
                        <Sparkles className="ml-2 h-4 w-4 text-purple-500" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {letter.isAiGenerated && (
                        <Badge variant="secondary" className="mr-2 mt-1">
                          AI Generated
                        </Badge>
                      )}
                      Created {new Date(letter.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {letter.content.substring(0, 150)}...
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/cover-letters/${letter.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCoverLetter(letter.id)}
                    disabled={deleteCoverLetterMutation.isPending}
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