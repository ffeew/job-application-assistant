"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Paper } from "@/components/ui/paper";
import { Stamp } from "@/components/ui/stamp";
import { pdfBase64ToBlob } from "@/lib/resume-preview";
import type { GeneratedResumeResult } from "@/lib/resume-document";

const pages = (count: number) => `${count} ${count === 1 ? "page" : "pages"}`;

export function ResumePDFPreview({
  result,
  stale = false,
}: {
  result: GeneratedResumeResult;
  stale?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const previewURL = useRef<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(pdfBase64ToBlob(result.pdfBase64));
    if (frame.current)
      frame.current.src = `${url}#toolbar=0&navpanes=0&view=FitH`;
    previewURL.current = url;
    return () => {
      URL.revokeObjectURL(url);
      previewURL.current = null;
    };
  }, [result.pdfBase64]);
  const pagesOver = result.fit.pageCount - result.fit.targetPages;
  return (
    <div className="flex flex-col gap-4">
      {stale && (
        <Notice tone="warning" role="status">
          Settings changed since this preview. Preview again before saving.
        </Notice>
      )}
      {/* A slip of paper, so the verdict is stamped where every ink reads. */}
      <Card
        layout="flush"
        className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-3"
      >
        <dl
          aria-label="Page fit"
          className="flex flex-wrap gap-x-8 gap-y-1 text-sm tabular-nums"
        >
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Pages</dt>
            <dd className="font-semibold">{result.fit.pageCount}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Target</dt>
            <dd className="font-semibold">{result.fit.targetPages}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Revisions</dt>
            <dd className="font-semibold">{result.fit.revisions}</dd>
          </div>
        </dl>
        <Stamp
          frame="double"
          pressed
          className={
            result.fit.fitsTarget ? "text-success" : "text-status-rejected"
          }
        >
          {result.fit.fitsTarget
            ? `Fits ${pages(result.fit.pageCount)}`
            : pagesOver > 0
              ? `Over by ${pages(pagesOver)}`
              : "Over target"}
        </Stamp>
      </Card>
      {result.fit.warnings.map((warning) => (
        <Notice key={warning} tone="warning" role="status">
          {warning}
        </Notice>
      ))}
      <Paper className="aspect-[210/297] w-full">
        <iframe
          ref={frame}
          className="size-full bg-white"
          title="Resume PDF preview"
        />
      </Paper>
      <button
        type="button"
        onClick={() => {
          if (previewURL.current)
            window.open(previewURL.current, "_blank", "noopener,noreferrer");
        }}
        className="text-link w-fit text-left text-sm underline underline-offset-4 hover:no-underline"
      >
        Open PDF in a new tab
      </button>
      {result.fit.changes.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            Changes made to fit the page target
          </summary>
          <ul className="text-muted-foreground mt-2 flex list-disc flex-col gap-1 pl-5">
            {result.fit.changes.map((change, index) => (
              <li key={`${index}-${change}`}>{change}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
