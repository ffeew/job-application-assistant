"use client";

import { useEffect, useRef } from "react";
import { withAsyncHandler } from "@/lib/async-action";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Notice } from "@/components/ui/notice";
import { Download, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useResumeData } from "@/app/dashboard/resumes/queries/use-resume-data";
import {
  useValidateResume,
  useGenerateResumePreview,
} from "@/app/dashboard/resumes/mutations/use-generate-resume";
import { generateResumeSchema } from "@/app/api/profile/validators";
import type { GenerateResumeRequest } from "@/app/api/profile/validators";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { FormFieldError } from "@/components/ui/form-field-error";
import { downloadPDF } from "@/lib/utils";
import { pdfBase64ToBlob, resumeRequestKey } from "@/lib/resume-preview";
import {
  PageTargetField,
  PreviewPane,
  ResumeWorkbench,
  TemplateNote,
  WorkbenchSkeleton,
} from "../components/resume-workbench";

// Exclude ID-list fields so section switches can only address boolean selections.
type ContentSelectionKey = Extract<
  keyof GenerateResumeRequest["contentSelection"],
  `include${string}`
>;

const backLink = { href: "/dashboard/resumes", label: "Resumes" };

export default function GenerateResumePage() {
  const {
    data: resumeData,
    isLoading: dataLoading,
    error: dataError,
  } = useResumeData();

  const validateMutation = useValidateResume();
  const previewMutation = useGenerateResumePreview();

  const preview = previewMutation.preview;
  const isValidating = validateMutation.isPending;
  const isGenerating = previewMutation.isPending;
  const generationError = previewMutation.error?.message;

  const form = useForm({
    resolver: zodResolver(generateResumeSchema),
    defaultValues: {
      title: "",
      template: "professional",
      targetPages: 1 as const,
      contentSelection: {
        includePersonalInfo: true,
        includeSummary: true,
        includeWorkExperience: true,
        includeEducation: true,
        includeSkills: true,
        includeProjects: false,
        includeCertifications: false,
        includeAchievements: false,
        includeReferences: false,
      },
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const contentSelection = useWatch({
    control: form.control,
    name: "contentSelection",
  });

  const watchedValues = useWatch({ control: form.control });
  const restoredJob = useRef<string | null>(null);
  useEffect(() => {
    const job = previewMutation.job;
    if (
      !job ||
      job.payload.kind !== "profile" ||
      restoredJob.current === job.id
    )
      return;
    restoredJob.current = job.id;
    if (!form.formState.isDirty)
      form.reset(job.payload.request, { keepFieldsRef: true });
  }, [previewMutation.job, form]);

  const stale = preview
    ? resumeRequestKey(preview.config) !== resumeRequestKey(watchedValues)
    : false;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as GenerateResumeRequest;
    try {
      const validation = await validateMutation.mutateAsync(validatedData);

      if (!validation.valid) {
        toast.error(
          `This resume can't be generated: ${validation.errors.join(", ")}`,
        );
        return;
      }

      if (
        preview &&
        resumeRequestKey(preview.config) === resumeRequestKey(validatedData)
      ) {
        downloadPDF(pdfBase64ToBlob(preview.pdfBase64), validatedData.title);
      } else {
        await previewMutation.mutateAsync(validatedData, "download");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't generate the resume. Try again.",
      );
    }
  };

  const handlePreview = async () => {
    try {
      if (!(await form.trigger())) return;
      const formData = generateResumeSchema.parse(form.getValues());
      await previewMutation.mutateAsync(formData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't generate the preview. Try again.",
      );
    }
  };

  if (dataLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Generate resume" back={backLink} />
        <WorkbenchSkeleton />
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Generate resume" back={backLink} />
        <Notice tone="error" title="Your profile didn't load">
          Reload the page to try again. If it keeps failing, check that your{" "}
          <Link href="/dashboard/profile">profile</Link> opens.
        </Notice>
      </div>
    );
  }

  const hasMinimalData =
    resumeData?.profile &&
    (resumeData.workExperiences.length > 0 ||
      resumeData.education.length > 0 ||
      resumeData.skills.length > 0);

  const count = (items: unknown[] | undefined) =>
    items && items.length > 0 ? String(items.length) : null;

  const sections: {
    key: ContentSelectionKey;
    label: string;
    available: string | null;
  }[] = [
    {
      key: "includePersonalInfo",
      label: "Personal information",
      available: resumeData?.profile ? "Added" : null,
    },
    {
      key: "includeSummary",
      label: "Professional summary",
      available: resumeData?.profile?.professionalSummary ? "Added" : null,
    },
    {
      key: "includeWorkExperience",
      label: "Work experience",
      available: count(resumeData?.workExperiences),
    },
    {
      key: "includeEducation",
      label: "Education",
      available: count(resumeData?.education),
    },
    {
      key: "includeSkills",
      label: "Skills",
      available: count(resumeData?.skills),
    },
    {
      key: "includeProjects",
      label: "Projects",
      available: count(resumeData?.projects),
    },
    {
      key: "includeCertifications",
      label: "Certifications",
      available: count(resumeData?.certifications),
    },
    {
      key: "includeAchievements",
      label: "Achievements",
      available: count(resumeData?.achievements),
    },
  ];

  const busy = isValidating || isGenerating;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Generate resume"
        description="Build a general resume from your profile. To aim one at a specific job, start from the application instead."
        back={backLink}
      />

      {!hasMinimalData && (
        <Notice
          tone="warning"
          title="Your profile is too empty to generate from"
        >
          Add your personal details and at least one work experience, education
          entry or skill.{" "}
          <Link href="/dashboard/profile">Open your profile</Link>
        </Notice>
      )}

      <ResumeWorkbench
        settings={
          <form
            onSubmit={withAsyncHandler(handleSubmit(onSubmit))}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Resume title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g. Software engineer resume"
              />
              <FormFieldError message={errors.title?.message} />
            </div>

            <PageTargetField
              value={watchedValues.targetPages}
              onValueChange={(value) =>
                setValue("targetPages", value, { shouldDirty: true })
              }
            />

            <TemplateNote />

            {/* A legend would sit on the divider, so the rule goes on a wrapper. */}
            <div className="border-t pt-6">
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Sections to include
                </legend>
                <ul className="flex flex-col gap-3">
                  {sections.map((section) => (
                    <li key={section.key} className="flex items-center gap-3">
                      <Checkbox
                        id={section.key}
                        checked={contentSelection[section.key]}
                        onCheckedChange={(checked) =>
                          setValue(`contentSelection.${section.key}`, !!checked)
                        }
                      />
                      <Label htmlFor={section.key} className="flex-1">
                        {section.label}
                      </Label>
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {section.available ?? "None yet"}
                      </span>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={withAsyncHandler(handlePreview)}
                disabled={!hasMinimalData || busy}
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Eye />}
                Preview
              </Button>
              <Button type="submit" disabled={!hasMinimalData || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Download />}
                Download PDF
              </Button>
            </div>

            {generationError && <Notice tone="error">{generationError}</Notice>}
          </form>
        }
        preview={
          <PreviewPane
            preview={preview}
            stale={stale}
            isGenerating={isGenerating}
            isQueued={previewMutation.status === "queued"}
            emptyHint="Select Preview to compile your resume and check how it fits the page."
          />
        }
      />
    </div>
  );
}
