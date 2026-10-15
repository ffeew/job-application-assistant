"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Paper } from "@/components/ui/paper";
import { Skeleton } from "@/components/ui/skeleton";
import { Save } from "lucide-react";
import { ResumePDFPreview } from "@/components/resume-pdf-preview";
import { withAsyncHandler } from "@/lib/async-action";
import { parseGeneratedResume } from "@/lib/resume-document";
import {
  updateResumeSchema,
  type ResumeJsonResponse,
} from "@/app/api/resumes/validators";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { useUpdateResume } from "../mutations/use-update-resume";
import { useSavedResumePDF } from "../queries/use-resumes";
import { ResumeWorkbench } from "./resume-workbench";
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
          toast.success("Details saved");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };
  const regenerateHref = resume.jobApplicationId
    ? `/dashboard/applications/${resume.jobApplicationId}/resume`
    : "/dashboard/resumes/generate";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={resume.title}
        back={{ href: "/dashboard/resumes", label: "Resumes" }}
      />
      <ResumeWorkbench
        settings={
          <>
            <form
              onSubmit={withAsyncHandler(form.handleSubmit(save))}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
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
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stored-default"
                  className="size-[18px]"
                  {...form.register("isDefault")}
                />
                <Label htmlFor="stored-default">Use as my default resume</Label>
              </div>
              <Button
                type="submit"
                className="w-fit"
                disabled={mutation.isPending}
              >
                <Save />
                Save details
              </Button>
            </form>

            <div className="flex flex-col items-start gap-3 border-t pt-6">
              <p className="text-muted-foreground text-sm">
                This page is a saved copy. To change what it says, update your
                profile and generate it again.
              </p>
              <Button variant="outline" asChild>
                <Link href={regenerateHref}>Generate again</Link>
              </Button>
            </div>
          </>
        }
        preview={
          <>
            {saved && pdf.data && (
              <ResumePDFPreview result={{ ...saved, pdfBase64: pdf.data }} />
            )}
            {saved && pdf.isPending && (
              <Skeleton className="aspect-[210/297] w-full rounded-none">
                <span className="sr-only">Rendering the saved PDF…</span>
              </Skeleton>
            )}
            {pdf.error && (
              <Notice tone="error" title="The saved PDF didn't render">
                <p>{pdf.error.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    void pdf.refetch();
                  }}
                >
                  Try again
                </Button>
              </Notice>
            )}
            {legacy && (
              <Paper className="aspect-[210/297] w-full">
                <iframe
                  title="Legacy resume preview"
                  sandbox=""
                  srcDoc={legacy}
                  className="size-full bg-white"
                />
              </Paper>
            )}
          </>
        }
      />
    </div>
  );
}
