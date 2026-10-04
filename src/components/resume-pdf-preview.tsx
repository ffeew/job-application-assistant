"use client";

import { useEffect, useRef } from "react";
import { pdfBase64ToBlob } from "@/lib/resume-preview";
import type { GeneratedResumeResult } from "@/lib/resume-document";

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
    if (frame.current) frame.current.src = `${url}#toolbar=0&navpanes=0&view=FitH`;
    previewURL.current = url;
    return () => {
      URL.revokeObjectURL(url);
      previewURL.current = null;
    };
  }, [result.pdfBase64]);
  return (
    <div className="flex flex-col gap-3">
      {stale && (
        <p role="status" className="text-sm text-amber-700">
          Options changed. Generate a new preview before saving this version.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {result.fit.pageCount} page{result.fit.pageCount === 1 ? "" : "s"} ·
        Target: {result.fit.targetPages} · {result.fit.revisions} revision
        {result.fit.revisions === 1 ? "" : "s"}
      </p>
      {result.fit.warnings.map((warning) => (
        <p key={warning} role="status" className="text-sm text-amber-700">
          {warning}
        </p>
      ))}
      <iframe
        ref={frame}
        className="h-[600px] w-full rounded-lg border bg-white"
        title="Resume PDF preview"
      />
      <button
        type="button"
        onClick={() => {
          if (previewURL.current)
            window.open(previewURL.current, "_blank", "noopener,noreferrer");
        }}
        className="text-left text-sm underline"
      >
        Open PDF in a new tab
      </button>
      {result.fit.changes.length > 0 && (
        <details className="text-sm">
          <summary>Changes made to fit the page target</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {result.fit.changes.map((change, index) => (
              <li key={`${index}-${change}`}>{change}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
