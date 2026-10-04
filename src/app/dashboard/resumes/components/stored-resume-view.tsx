"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumePDFPreview } from "@/components/resume-pdf-preview";
import { withAsyncHandler } from "@/lib/async-action";
import { parseGeneratedResume } from "@/lib/resume-document";
import {
  updateResumeSchema,
  type ResumeJsonResponse,
} from "@/app/api/resumes/validators";
import { useUpdateResume } from "../mutations/use-update-resume";
import { useSavedResumePDF } from "../queries/use-resumes";
import { z } from "zod";

const legacyHtmlSchema = z.object({ html: z.string() });
const detailsSchema = updateResumeSchema
  .pick({ title: true, isDefault: true })
  .required();
type ResumeDetails = z.infer<typeof detailsSchema>;
export function legacyResumeHTML(content: string): string | null {
  try {
    const raw: unknown = JSON.parse(content);
    const parsed = legacyHtmlSchema.safeParse(raw);
    return parsed.success ? parsed.data.html : null;
  } catch {
    return null;
  }
}

export function StoredResumeView({ resume }: { resume: ResumeJsonResponse }) {
  const saved = parseGeneratedResume(resume.content);
  const legacy = legacyResumeHTML(resume.content);
  const pdf = useSavedResumePDF(resume.id, Boolean(saved));
  const mutation = useUpdateResume();
  const form = useForm<ResumeDetails>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: resume.title, isDefault: resume.isDefault },
  });
  const save = (data: ResumeDetails) => {
    mutation.mutate(
      { id: resume.id, data },
      {
        onSuccess: () => {
          toast.success("Resume details saved.");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/resumes" className="text-sm underline">
        Back to resumes
      </Link>
      <h1 className="text-3xl font-bold">{resume.title}</h1>
      <form
        onSubmit={withAsyncHandler(form.handleSubmit(save))}
        className="flex flex-col gap-4 rounded-lg border p-5"
      >
        <Label htmlFor="stored-title">Resume title</Label>
        <Input
          id="stored-title"
          aria-invalid={Boolean(form.formState.errors.title)}
          {...form.register("title")}
        />
        {form.formState.errors.title && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("isDefault")} />
          Set as default resume
        </label>
        <Button type="submit" disabled={mutation.isPending}>
          Save details
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        This is a saved generated resume. Update your profile and regenerate it
        to change the content.
      </p>
      <Button variant="outline" asChild>
        <Link
          href={
            resume.jobApplicationId
              ? `/dashboard/applications/${resume.jobApplicationId}/resume`
              : "/dashboard/resumes/generate"
          }
        >
          Regenerate resume
        </Link>
      </Button>
      {saved && pdf.data && (
        <ResumePDFPreview result={{ ...saved, pdfBase64: pdf.data }} />
      )}
      {saved && pdf.isPending && (
        <Skeleton className="h-96 rounded-lg">
          Rendering saved PDF…
        </Skeleton>
      )}
      {pdf.error && (
        <div role="alert" className="flex flex-col gap-2">
          <p>{pdf.error.message}</p>
          <Button
            variant="outline"
            onClick={() => {
              void pdf.refetch();
            }}
          >
            Retry PDF
          </Button>
        </div>
      )}
      {legacy && (
        <iframe
          title="Legacy resume preview"
          sandbox=""
          srcDoc={legacy}
          className="h-[600px] w-full rounded-lg border bg-white"
        />
      )}
    </div>
  );
}
