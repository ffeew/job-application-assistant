"use client";

import { useState } from "react";
import { withAsyncHandler } from "@/lib/async-action";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Notice } from "@/components/ui/notice";
import { FileText, PenLine, Trash2 } from "lucide-react";
import type { CoverLetterJsonResponse } from "@/app/api/cover-letters/validators";
import { useCoverLetters } from "@/app/dashboard/cover-letters/queries/use-cover-letters";
import { useDeleteCoverLetter } from "@/app/dashboard/cover-letters/mutations/use-delete-cover-letter";
import { EmptyState } from "@/app/dashboard/components/empty-state";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { RowListSkeleton } from "@/app/dashboard/components/row-list-skeleton";
import { formatShortDate } from "@/lib/format-date";

export default function CoverLettersPage() {
  const { data: coverLetters = [], isLoading, error, refetch } = useCoverLetters();
  const deleteCoverLetterMutation = useDeleteCoverLetter();
  const [pendingDelete, setPendingDelete] =
    useState<CoverLetterJsonResponse | null>(null);

  if (isLoading) {
    return <RowListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Cover letters" />
        <Notice tone="error" title="Your cover letters didn't load">
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

  const writeButton = (
    <Button asChild>
      <Link href="/dashboard/cover-letters/new">
        <PenLine />
        Write cover letter
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cover letters"
        description="Letters drafted from a job and one of your resumes. Open one to edit or copy it."
        actions={writeButton}
      />

      {coverLetters.length === 0 ? (
        <EmptyState title="No cover letters yet" actions={writeButton}>
          Write one from a job listing. It works best once you have a resume
          and an application saved.
        </EmptyState>
      ) : (
        <Card layout="flush">
          <ul>
            {coverLetters.map((letter) => (
              <li
                key={letter.id}
                className="flex flex-col gap-3 border-b px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{letter.title}</span>
                    {letter.isAiGenerated && (
                      <Badge variant="outline">Drafted with AI</Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    Created {formatShortDate(letter.createdAt)}
                  </p>
                  <p className="text-muted-foreground line-clamp-2 max-w-[75ch] text-sm">
                    {letter.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/cover-letters/${letter.id}`}>
                      <FileText />
                      Open
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${letter.title}`}
                    onClick={() => setPendingDelete(letter)}
                    disabled={deleteCoverLetterMutation.isPending}
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
        title="Delete this cover letter?"
        description={
          pendingDelete &&
          `"${pendingDelete.title}" will be removed. This can't be undone.`
        }
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteCoverLetterMutation.mutate(pendingDelete.id, {
            onSuccess: () => toast.success("Cover letter deleted"),
            onError: () =>
              toast.error("Couldn't delete the cover letter. Try again."),
          });
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
