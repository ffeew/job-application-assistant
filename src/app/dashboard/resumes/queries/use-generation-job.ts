"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/app/utils/authClient";
import {
  acceptedGenerationJobSchema,
  generationJobResponseSchema,
  latestGenerationJobSchema,
  type GenerationJobPayload,
} from "@/app/api/resume-generation/jobs/validators";
import { isRetryableError, parseJsonResponse } from "@/lib/api-response";
import { pdfBase64ToBlob } from "@/lib/resume-preview";
import { downloadPDF } from "@/lib/utils";

export function useGenerationJob(applicationId: string | null | undefined) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const delivered = useRef<string | null>(null);
  const latestKey = ["generation-jobs", userId, applicationId] as const;
  const latest = useQuery({
    queryKey: latestKey,
    enabled: !!userId && applicationId !== undefined,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const suffix = applicationId
        ? `?applicationId=${encodeURIComponent(applicationId)}`
        : "";
      const response = await fetch(`/api/resume-generation/jobs${suffix}`);
      return parseJsonResponse(
        response,
        latestGenerationJobSchema,
        "Could not restore generation.",
      );
    },
  });
  const submit = useMutation({
    retry: false,
    mutationFn: async ({
      payload,
    }: {
      payload: GenerationJobPayload;
      userId: string;
    }) => {
      const response = await fetch("/api/resume-generation/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return parseJsonResponse(
        response,
        acceptedGenerationJobSchema,
        "Could not start generation.",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: latestKey });
    },
  });
  const submittedHere =
    submit.variables?.userId === userId &&
    (submit.variables?.payload.kind === "profile"
      ? applicationId === null
      : submit.variables?.payload.request.applicationId === applicationId);
  const jobId =
    (submittedHere ? submit.data?.jobId : undefined) ?? latest.data?.id;
  const polling = useQuery({
    queryKey: ["generation-job", userId, jobId],
    enabled: !!userId && !!jobId,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => {
      // A job the server no longer has will not reappear; only outages are waited out.
      if (query.state.error && !isRetryableError(query.state.error))
        return false;
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 2000;
    },
    queryFn: async () => {
      if (!jobId) throw new Error("Missing generation job.");
      const response = await fetch(
        `/api/resume-generation/jobs/${encodeURIComponent(jobId)}`,
      );
      return parseJsonResponse(
        response,
        generationJobResponseSchema,
        "Could not retrieve generation.",
      );
    },
  });
  const job =
    polling.data ?? (latest.data?.id === jobId ? latest.data : undefined);
  const status =
    job?.status ?? (submittedHere ? submit.data?.status : undefined);

  useEffect(() => {
    if (
      !job ||
      !submittedHere ||
      submit.data?.jobId !== job.id ||
      delivered.current === job.id
    )
      return;
    if (job.status === "failed") {
      delivered.current = job.id;
      toast.error(job.error ?? "The resume couldn't be generated. Try again.");
    } else if (job.status === "completed" && job.result) {
      delivered.current = job.id;
      if (job.payload.intent !== "preview")
        downloadPDF(
          pdfBase64ToBlob(job.result.pdfBase64),
          job.payload.request.title,
        );
      toast.success(
        job.savedResumeId
          ? "Resume saved and PDF downloaded"
          : job.payload.intent === "preview"
            ? "Preview ready"
            : "PDF downloaded",
      );
    }
  }, [job, submittedHere, submit.data?.jobId, queryClient]);

  useEffect(() => {
    if (job?.status !== "completed" || !job.savedResumeId) return;
    void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    void queryClient.invalidateQueries({
      queryKey: ["job-application-resume"],
    });
  }, [job?.id, job?.status, job?.savedResumeId, queryClient]);

  return {
    job,
    status,
    preview: job?.status === "completed" ? job.result : null,
    isPending:
      submit.isPending ||
      status === "queued" ||
      status === "running" ||
      (!!jobId && !job && !polling.error) ||
      (latest.isPending && latest.fetchStatus === "fetching"),
    error:
      (submittedHere ? submit.error : null) ??
      polling.error ??
      latest.error ??
      (job?.error ? new Error(job.error) : null),
    mutateAsync: (payload: GenerationJobPayload) => {
      if (!userId)
        return Promise.reject(new Error("Sign in to generate a resume."));
      return submit.mutateAsync({ payload, userId });
    },
  };
}
