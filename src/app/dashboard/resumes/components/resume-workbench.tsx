"use client";

import { Loader2 } from "lucide-react";
import { Paper } from "@/components/ui/paper";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumePDFPreview } from "@/components/resume-pdf-preview";
import type { GeneratedResumeResult } from "@/lib/resume-document";

/**
 * Settings beside the page they produce. The page width is capped from the
 * viewport height (less the page header and readout) so the whole sheet is
 * visible without scrolling.
 */
export function ResumeWorkbench({
  settings,
  preview,
}: {
  settings: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">{settings}</div>
      <div className="lg:sticky lg:top-6">
        <div className="mx-auto w-full lg:max-w-[calc((100vh-20rem)*210/297)] lg:min-w-80">
          {preview}
        </div>
      </div>
    </div>
  );
}

interface PreviewPaneProps {
  preview: GeneratedResumeResult | null | undefined;
  stale: boolean;
  isGenerating: boolean;
  isQueued: boolean;
  emptyHint: string;
}

export function PreviewPane({
  preview,
  stale,
  isGenerating,
  isQueued,
  emptyHint,
}: PreviewPaneProps) {
  if (isGenerating) {
    return (
      <Paper className="flex aspect-[210/297] w-full flex-col items-center justify-center gap-3 p-10 text-center font-sans">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p role="status" className="max-w-[32ch] text-sm">
          <span className="font-semibold">
            {isQueued
              ? "Your resume is queued."
              : "Compiling and checking the fit."}
          </span>{" "}
          You can leave this page. The result will be here when you come back.
        </p>
      </Paper>
    );
  }

  if (preview) return <ResumePDFPreview result={preview} stale={stale} />;

  return (
    <Paper className="flex aspect-[210/297] w-full items-center justify-center p-10 text-center font-sans">
      <p className="text-paper-foreground/70 max-w-[30ch] text-sm">
        {emptyHint}
      </p>
    </Paper>
  );
}

const pageTargets = [
  { value: 1, label: "1 page" },
  { value: 2, label: "2 pages" },
] as const;

export function PageTargetField({
  value,
  onValueChange,
}: {
  value: 1 | 2 | undefined;
  onValueChange: (value: 1 | 2) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p id="target-pages-label" className="text-sm font-medium">
        Length
      </p>
      <SegmentedControl
        name="targetPages"
        labelledBy="target-pages-label"
        options={pageTargets}
        value={value}
        onValueChange={onValueChange}
      />
      <p className="text-muted-foreground text-sm">
        If the resume runs longer, the wording is tightened and the least
        relevant bullets are dropped. Your profile is not changed.
      </p>
    </div>
  );
}

/** There is one template, so it is stated rather than offered as a choice. */
export function TemplateNote() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">Template</p>
      <p className="text-muted-foreground text-sm">
        Professional, typeset with LaTeX on A4.
      </p>
    </div>
  );
}

export function WorkbenchSkeleton() {
  return (
    <ResumeWorkbench
      settings={
        <>
          <Skeleton className="h-10" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-28" />
          <Skeleton className="h-10 w-64" />
        </>
      }
      preview={<Skeleton className="aspect-[210/297] w-full rounded-none" />}
    />
  );
}
