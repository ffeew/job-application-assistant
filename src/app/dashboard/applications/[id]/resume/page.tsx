"use client";

import { runAsyncAction, withAsyncHandler } from "@/lib/async-action";
import { useState, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Highlight } from "@/components/ui/highlight";
import { Notice } from "@/components/ui/notice";
import { Download, Eye, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useApplicationResumeInfo } from "@/app/dashboard/applications/queries/use-application-resume-info";
import {
  useGenerateJobApplicationPreview,
  useSaveTailoredResume,
} from "@/app/dashboard/applications/mutations/use-generate-job-application-resume";
import { jobApplicationResumeRequestSchema } from "@/app/api/profile/validators";
import type { JobApplicationResumeRequest } from "@/app/api/profile/validators";
import { PageHeader } from "@/app/dashboard/components/page-header";
import {
  PageTargetField,
  PreviewPane,
  ResumeWorkbench,
  TemplateNote,
  WorkbenchSkeleton,
} from "@/app/dashboard/resumes/components/resume-workbench";
import { FormFieldError } from "@/components/ui/form-field-error";
import { downloadPDF } from "@/lib/utils";
import { pdfBase64ToBlob, resumeRequestKey } from "@/lib/resume-preview";

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export default function JobApplicationResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null,
  );

  const {
    data: applicationInfo,
    isLoading,
    error,
  } = useApplicationResumeInfo(resolvedParams?.id || "");

  const previewMutation = useGenerateJobApplicationPreview(resolvedParams?.id);
  const preview = previewMutation.preview;
  const aiSelection = preview?.aiSelection ?? null;
  // A save names the previewed job; the server keeps that job's document and PDF.
  const previewJobId = preview ? previewMutation.job?.id : undefined;
  const saveMutation = useSaveTailoredResume();

  const isGeneratingPreview = previewMutation.isPending;
  const isGeneratingPDF = previewMutation.isPending || saveMutation.isPending;
  const isSaving = saveMutation.isPending;
  const previewError = previewMutation.error;

  const form = useForm({
    resolver: zodResolver(
      jobApplicationResumeRequestSchema.omit({ applicationId: true }),
    ),
    defaultValues: {
      title: "",
      template: "professional" as const,
      targetPages: 1 as const,
      useAISelection: true,
      maxWorkExperiences: 4,
      maxProjects: 3,
      maxSkills: 12,
      manualOverrides: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const watchedValues = useWatch({ control: form.control });
  const restoredJob = useRef<string | null>(null);
  useEffect(() => {
    const job = previewMutation.job;
    if (
      !job ||
      job.payload.kind !== "application" ||
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

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    runAsyncAction(resolveParams());
  }, [params]);

  // The suggested title is offered once. Refilling it whenever the field is
  // empty would stop anyone from clearing it to type their own.
  const titleSuggested = useRef(false);
  useEffect(() => {
    if (!applicationInfo) return;
    if (!applicationInfo.hasJobDescription) setValue("useAISelection", false);
    if (titleSuggested.current) return;
    titleSuggested.current = true;
    if (!form.getValues("title")) {
      setValue(
        "title",
        `${applicationInfo.position} Resume - ${applicationInfo.company}`,
      );
    }
  }, [applicationInfo, setValue, form]);

  const onSubmit = async (data: unknown) => {
    if (!resolvedParams?.id) return;
    // Data validated by Zod.
    const validatedData = data as Omit<
      JobApplicationResumeRequest,
      "applicationId"
    >;
    try {
      if (
        preview &&
        previewJobId &&
        resumeRequestKey(preview.config) === resumeRequestKey(validatedData)
      ) {
        await saveMutation.mutateAsync({
          applicationId: resolvedParams.id,
          data: { title: validatedData.title, jobId: previewJobId },
        });
        downloadPDF(pdfBase64ToBlob(preview.pdfBase64), validatedData.title);
        toast.success("Resume saved and PDF downloaded");
      } else {
        await previewMutation.mutateAsync({
          applicationId: resolvedParams.id,
          data: validatedData,
          intent: "save-and-download",
        });
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
    if (!resolvedParams?.id) return;
    try {
      if (!(await form.trigger())) return;
      const data = jobApplicationResumeRequestSchema
        .omit({ applicationId: true })
        .parse(form.getValues());
      await previewMutation.mutateAsync({
        applicationId: resolvedParams.id,
        data,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't generate the preview. Try again.",
      );
    }
  };

  const handleSaveResume = async () => {
    if (!resolvedParams?.id || !previewJobId || stale) return;

    const formData = form.getValues();
    try {
      await saveMutation.mutateAsync({
        applicationId: resolvedParams.id,
        data: { title: formData.title, jobId: previewJobId },
      });
      toast.success("Resume saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't save the resume. Try again.",
      );
    }
  };

  if (!resolvedParams || isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Tailor resume"
          back={{ href: "/dashboard/applications", label: "Applications" }}
        />
        <WorkbenchSkeleton />
      </div>
    );
  }

  if (error || !applicationInfo) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Tailor resume"
          back={{ href: "/dashboard/applications", label: "Applications" }}
        />
        <Notice tone="error" title="This application didn't load">
          It may have been deleted, or it belongs to another account. Go back to
          your applications and open it again.
        </Notice>
      </div>
    );
  }

  const applicationHref = `/dashboard/applications/${resolvedParams.id}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tailor resume"
        description={`${applicationInfo.position} at ${applicationInfo.company}${
          applicationInfo.location ? `, ${applicationInfo.location}` : ""
        }`}
        back={{ href: applicationHref, label: "Application" }}
      />

      <ResumeWorkbench
        settings={
          <>
            <form
              onSubmit={withAsyncHandler(handleSubmit(onSubmit))}
              className="flex flex-col gap-6"
            >
              {applicationInfo.tailoredResume && (
                <Notice tone="success">
                  A resume is already saved for this application. Saving again
                  replaces it.
                </Notice>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Resume title</Label>
                <Input id="title" {...register("title")} />
                <FormFieldError message={errors.title?.message} />
              </div>

              <PageTargetField
                value={watchedValues.targetPages}
                onValueChange={(value) =>
                  setValue("targetPages", value, { shouldDirty: true })
                }
              />

              <TemplateNote />

              {applicationInfo.hasJobDescription ? (
                <div className="flex flex-col gap-4 border-t pt-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="useAISelection"
                      className="mt-0.5"
                      checked={watchedValues.useAISelection}
                      onCheckedChange={(checked) =>
                        setValue("useAISelection", !!checked)
                      }
                    />
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="useAISelection" className="leading-snug">
                        Match content to the job description
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Picks the experience, projects and skills that fit this
                        listing. Turn it off to include everything.
                      </p>
                    </div>
                  </div>

                  {watchedValues.useAISelection && (
                    <fieldset className="flex flex-col gap-4 pl-[30px]">
                      <legend className="mb-3 text-sm font-medium">
                        Include at most
                      </legend>
                      <div className="flex flex-col gap-1">
                        <Label
                          htmlFor="maxWorkExperiences"
                          className="justify-between"
                        >
                          Work experiences
                          <span className="tabular-nums">
                            {watchedValues.maxWorkExperiences}
                          </span>
                        </Label>
                        <input
                          id="maxWorkExperiences"
                          type="range"
                          min="1"
                          max="8"
                          step="1"
                          value={watchedValues.maxWorkExperiences}
                          onChange={(e) =>
                            setValue(
                              "maxWorkExperiences",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label
                          htmlFor="maxProjects"
                          className="justify-between"
                        >
                          Projects
                          <span className="tabular-nums">
                            {watchedValues.maxProjects}
                          </span>
                        </Label>
                        <input
                          id="maxProjects"
                          type="range"
                          min="0"
                          max="6"
                          step="1"
                          value={watchedValues.maxProjects}
                          onChange={(e) =>
                            setValue("maxProjects", parseInt(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label htmlFor="maxSkills" className="justify-between">
                          Skills
                          <span className="tabular-nums">
                            {watchedValues.maxSkills}
                          </span>
                        </Label>
                        <input
                          id="maxSkills"
                          type="range"
                          min="5"
                          max="20"
                          step="1"
                          value={watchedValues.maxSkills}
                          onChange={(e) =>
                            setValue("maxSkills", parseInt(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>
                    </fieldset>
                  )}
                </div>
              ) : (
                <Notice tone="warning" title="No job description">
                  Content can only be matched to a listing once its text is
                  saved.{" "}
                  <Link href={applicationHref}>Add the job description</Link> to
                  this application, or continue and include everything.
                </Notice>
              )}

              <div className="grid grid-cols-2 gap-2 border-t pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className={previewJobId ? undefined : "col-span-2"}
                  onClick={withAsyncHandler(handlePreview)}
                  disabled={isGeneratingPreview || isSaving}
                >
                  {isGeneratingPreview ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Eye />
                  )}
                  Preview
                </Button>
                {previewJobId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={withAsyncHandler(handleSaveResume)}
                    disabled={isSaving || stale || isGeneratingPreview}
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                    Save resume
                  </Button>
                )}
                <Button
                  type="submit"
                  className="col-span-2"
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  Save and download PDF
                </Button>
              </div>

              {(previewError || saveMutation.error) && (
                <Notice tone="error">
                  {previewError?.message || saveMutation.error?.message}
                </Notice>
              )}
            </form>

            {aiSelection && (
              <section aria-labelledby="matched-title">
                {/* A sheet, because highlighter disappears on the folder's manila. */}
                <Card layout="flush" className="flex flex-col gap-3 p-5">
                  <h2 id="matched-title" className="text-lg font-semibold">
                    What was matched
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {aiSelection.overallStrategy}
                  </p>
                  {aiSelection.keyMatchingPoints.length > 0 && (
                    <ul className="flex flex-col gap-1.5 text-sm">
                      {aiSelection.keyMatchingPoints.map((point, index) => (
                        <li key={index}>
                          <Highlight>{point}</Highlight>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-muted-foreground text-sm">
                    Selected{" "}
                    {plural(
                      aiSelection.selectedWorkExperiences.length,
                      "work experience",
                    )}
                    , {plural(aiSelection.selectedSkills.length, "skill")},{" "}
                    {plural(aiSelection.selectedProjects.length, "project")} and{" "}
                    {plural(
                      aiSelection.selectedEducation.length,
                      "education entry",
                      "education entries",
                    )}
                    .
                  </p>
                </Card>
              </section>
            )}
          </>
        }
        preview={
          <PreviewPane
            preview={preview}
            stale={stale}
            isGenerating={isGeneratingPreview}
            isQueued={previewMutation.status === "queued"}
            emptyHint="Select Preview to compile this resume and check how it fits the page."
          />
        }
      />
    </div>
  );
}
