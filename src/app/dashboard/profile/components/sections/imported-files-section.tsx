"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Notice } from "@/components/ui/notice";
import { EmptyState } from "@/app/dashboard/components/empty-state";
import type { ResumeUploadJson } from "@/app/api/profile/resume-uploads/validators";
import { useResumeUploads } from "@/app/dashboard/profile/queries/use-resume-uploads";
import { useDeleteResumeUpload } from "@/app/dashboard/profile/mutations/use-delete-resume-upload";
import { useDownloadResumeUpload } from "@/app/dashboard/profile/mutations/use-download-resume-upload";
import { formatShortDate } from "@/lib/format-date";
import { downloadFile } from "@/lib/utils";
import { ProfileItemSkeleton } from "../profile-item-skeleton";
import { EntryMeta, EntryPanel, SectionHeader } from "../section-parts";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportedFilesSection() {
  const uploads = useResumeUploads();
  const deleteMutation = useDeleteResumeUpload();
  const downloadMutation = useDownloadResumeUpload();
  const [fileToDelete, setFileToDelete] = useState<ResumeUploadJson | null>(
    null,
  );

  if (uploads.isLoading) return <ProfileItemSkeleton />;

  const files = uploads.data?.files ?? [];

  const handleDownload = (file: ResumeUploadJson) => {
    downloadMutation.mutate(file.id, {
      onSuccess: (blob) => {
        downloadFile(blob, file.fileName);
        toast.success("File downloaded");
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDelete = () => {
    if (!fileToDelete) return;
    deleteMutation.mutate(fileToDelete.id, {
      onSuccess: () => {
        toast.success("File deleted");
        setFileToDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Imported files"
          description="The original of each resume you imported, kept so you can download it again. Only the 10 most recent are kept."
        />

        {uploads.error && (
          <Notice tone="error" title="Your imported files didn't load">
            <p>{uploads.error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                void uploads.refetch();
              }}
            >
              Try again
            </Button>
          </Notice>
        )}

        {uploads.data && !uploads.data.available && (
          <Notice title="Imported files are not being kept">
            This server has no file storage set up, so an import reads your
            resume and then discards the file.
          </Notice>
        )}

        {uploads.data?.available && files.length === 0 && (
          <EmptyState title="No imported files yet">
            Import a resume from the top of this page and the original file is
            kept here.
          </EmptyState>
        )}

        {files.length > 0 && (
          <EntryPanel>
            {files.map((file) => {
              const isDownloading =
                downloadMutation.isPending &&
                downloadMutation.variables === file.id;
              return (
                <li
                  key={file.id}
                  className="flex items-start justify-between gap-4 border-b px-5 py-4 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h3 className="font-semibold break-words">
                      {file.fileName}
                    </h3>
                    <EntryMeta>
                      <span>Imported {formatShortDate(file.createdAt)}</span>
                      <span>{formatFileSize(file.sizeBytes)}</span>
                    </EntryMeta>
                  </div>
                  <div className="text-muted-foreground flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Download ${file.fileName}`}
                      onClick={() => handleDownload(file)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Download />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${file.fileName}`}
                      onClick={() => setFileToDelete(file)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </EntryPanel>
        )}
      </div>

      <ConfirmDeleteDialog
        open={fileToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFileToDelete(null);
        }}
        title="Delete this file?"
        description={
          <>
            <span className="break-words">{fileToDelete?.fileName}</span> will
            be removed from storage. Details you saved from it stay in your
            profile.
          </>
        }
        onConfirm={handleDelete}
      />
    </>
  );
}
