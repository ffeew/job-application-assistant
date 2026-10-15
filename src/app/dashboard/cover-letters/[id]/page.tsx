"use client";

import { runAsyncAction, withAsyncHandler } from "@/lib/async-action";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Copy, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CoverLetterJsonResponse } from "@/app/api/cover-letters/validators";
import { useCoverLetter } from "@/app/dashboard/cover-letters/queries/use-cover-letters";
import { useDeleteCoverLetter } from "@/app/dashboard/cover-letters/mutations/use-delete-cover-letter";
import { useUpdateCoverLetter } from "@/app/dashboard/cover-letters/mutations/use-update-cover-letter";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { formatShortDate } from "@/lib/format-date";
import { CoverLetterDetailSkeleton } from "../components/cover-letter-detail-skeleton";
import { LetterPage } from "../components/letter-page";

function CoverLetterEditor({
  coverLetter,
}: {
  coverLetter: CoverLetterJsonResponse;
}) {
  const router = useRouter();
  const updateCoverLetterMutation = useUpdateCoverLetter();
  const deleteCoverLetterMutation = useDeleteCoverLetter();
  const [title, setTitle] = useState(coverLetter.title);
  const [content, setContent] = useState(coverLetter.content);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const hasChanges =
    title !== coverLetter.title || content !== coverLetter.content;
  const canSave = hasChanges && title.trim() !== "" && content.trim() !== "";

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Letter copied");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };

  const handleSave = () => {
    updateCoverLetterMutation.mutate(
      { id: coverLetter.id, data: { title, content } },
      {
        onSuccess: () => toast.success("Changes saved"),
        onError: () => toast.error("Couldn't save the changes. Try again."),
      },
    );
  };

  const handleDelete = () => {
    deleteCoverLetterMutation.mutate(coverLetter.id, {
      onSuccess: () => {
        toast.success("Cover letter deleted");
        router.push("/dashboard/cover-letters");
      },
      onError: () => {
        toast.error("Couldn't delete the cover letter. Try again.");
      },
    });
  };

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title={coverLetter.title}
        description={`Created ${formatShortDate(coverLetter.createdAt)}${
          coverLetter.isAiGenerated ? ", drafted with AI" : ""
        }`}
        back={{ href: "/dashboard/cover-letters", label: "Cover letters" }}
        actions={
          <>
            <Button
              variant="outline"
              onClick={withAsyncHandler(handleCopyContent)}
            >
              <Copy />
              Copy letter
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(true)}
              disabled={deleteCoverLetterMutation.isPending}
            >
              <Trash2 />
              Delete
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <LetterPage
          aria-label="Cover letter text"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <Button
          className="w-fit self-end"
          onClick={handleSave}
          disabled={!canSave || updateCoverLetterMutation.isPending}
        >
          <Save />
          {updateCoverLetterMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this cover letter?"
        description={`"${coverLetter.title}" will be removed. This can't be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function ViewCoverLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null,
  );

  const {
    data: coverLetter,
    isLoading,
    error,
  } = useCoverLetter(resolvedParams?.id || "");

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    runAsyncAction(resolveParams());
  }, [params]);

  if (!resolvedParams || isLoading) {
    return <CoverLetterDetailSkeleton />;
  }

  if (error || !coverLetter) {
    return (
      <div className="flex max-w-3xl flex-col gap-8">
        <PageHeader
          title="Cover letter"
          back={{ href: "/dashboard/cover-letters", label: "Cover letters" }}
        />
        <Notice tone="error" title="This cover letter didn't load">
          It may have been deleted, or the server could not be reached. Go back
          to your cover letters and open it again.
        </Notice>
      </div>
    );
  }

  // Keyed so the draft starts from the saved text of whichever letter is open.
  return <CoverLetterEditor key={coverLetter.id} coverLetter={coverLetter} />;
}
