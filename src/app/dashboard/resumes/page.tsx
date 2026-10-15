"use client";

import { useState } from "react";
import { withAsyncHandler } from "@/lib/async-action";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Notice } from "@/components/ui/notice";
import { FileText, PenLine, Star, Trash2, Wand2 } from "lucide-react";
import { useResumes } from "@/app/dashboard/resumes/queries/use-resumes";
import { useDeleteResume } from "@/app/dashboard/resumes/mutations/use-delete-resume";
import { useUpdateResume } from "@/app/dashboard/resumes/mutations/use-update-resume";
import type { ResumeJsonResponse } from "@/app/api/resumes/validators";
import { EmptyState } from "@/app/dashboard/components/empty-state";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { formatShortDate } from "@/lib/format-date";
import { toast } from "sonner";
import { ResumesListSkeleton } from "./components/resumes-list-skeleton";

export default function ResumesPage() {
  const { data: resumes = [], isLoading, error, refetch } = useResumes();
  const deleteResumeMutation = useDeleteResume();
  const updateResumeMutation = useUpdateResume();
  const [pendingDelete, setPendingDelete] = useState<ResumeJsonResponse | null>(
    null,
  );

  const handleDeleteResume = async (id: string) => {
    try {
      await deleteResumeMutation.mutateAsync(id);
      toast.success("Resume deleted");
    } catch {
      toast.error("Couldn't delete the resume. Try again.");
    }
  };

  const toggleDefault = async (id: string) => {
    try {
      const resume = resumes.find((r) => r.id === id);
      if (!resume) return;

      await updateResumeMutation.mutateAsync({
        id,
        data: { isDefault: !resume.isDefault },
      });
      toast.success(resume.isDefault ? "Default removed" : "Set as default");
    } catch {
      toast.error("Couldn't update the resume. Try again.");
    }
  };

  if (isLoading) {
    return <ResumesListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Resumes" />
        <Notice tone="error" title="Your resumes didn't load">
          <p>{error.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={withAsyncHandler(() => refetch())}
          >
            Try again
          </Button>
        </Notice>
      </div>
    );
  }

  const actions = (
    <>
      <Button variant="outline" asChild>
        <Link href="/dashboard/resumes/new">
          <PenLine />
          Write manually
        </Link>
      </Button>
      <Button asChild>
        <Link href="/dashboard/resumes/generate">
          <Wand2 />
          Generate from profile
        </Link>
      </Button>
    </>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Resumes"
        description={
          <>
            Saved resumes. To aim one at a specific job,{" "}
            <Link
              href="/dashboard/applications"
              className="text-link underline underline-offset-4 hover:no-underline"
            >
              open the application
            </Link>{" "}
            and tailor it there.
          </>
        }
        actions={actions}
      />

      {resumes.length === 0 ? (
        <EmptyState title="No resumes yet" actions={actions}>
          Generate one from your profile, or tailor one to a job from its
          application.
        </EmptyState>
      ) : (
        <Card layout="flush">
          <ul>
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="flex flex-col gap-3 border-b px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{resume.title}</span>
                    {resume.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    {resume.isTailored && (
                      <Badge variant="outline">Tailored</Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    Updated {formatShortDate(resume.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/resumes/${resume.id}`}>
                      <FileText />
                      Open
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={resume.isDefault}
                    onClick={withAsyncHandler(() => toggleDefault(resume.id))}
                    disabled={updateResumeMutation.isPending}
                  >
                    <Star
                      className={resume.isDefault ? "fill-current" : undefined}
                    />
                    {resume.isDefault ? "Default" : "Set as default"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${resume.title}`}
                    onClick={() => setPendingDelete(resume)}
                    disabled={deleteResumeMutation.isPending}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this resume?"
        description={
          pendingDelete &&
          `"${pendingDelete.title}" will be removed. This can't be undone.`
        }
        onConfirm={withAsyncHandler(async () => {
          if (!pendingDelete) return;
          const { id } = pendingDelete;
          setPendingDelete(null);
          await handleDeleteResume(id);
        })}
      />
    </div>
  );
}
