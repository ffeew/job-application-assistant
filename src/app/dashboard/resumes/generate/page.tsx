"use client";

import { useEffect, useRef } from "react";
import { withAsyncHandler } from "@/lib/async-action";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useResumeData } from "@/app/dashboard/resumes/queries/use-resume-data";
import {
  useValidateResume,
  useGenerateResumePreview,
} from "@/app/dashboard/resumes/mutations/use-generate-resume";
import { generateResumeSchema } from "@/app/api/profile/validators";
import type { GenerateResumeRequest } from "@/app/api/profile/validators";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";
import { FormFieldError } from "@/components/ui/form-field-error";
import { downloadPDF } from "@/lib/utils";
import { ResumePDFPreview } from "@/components/resume-pdf-preview";
import { pdfBase64ToBlob, resumeRequestKey } from "@/lib/resume-preview";

export default function GenerateResumePage() {
  const {
    data: resumeData,
    isLoading: dataLoading,
    error: dataError,
  } = useResumeData();

  // Simple mutation hooks
  const validateMutation = useValidateResume();
  const previewMutation = useGenerateResumePreview();

  // Derived state
  const preview = previewMutation.preview;
  const isValidating = validateMutation.isPending;
  const isGenerating = previewMutation.isPending;
  const generationError = previewMutation.error?.message;
  const isGeneratingPreview = previewMutation.isPending;

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
      // Validation step
      const validation = await validateMutation.mutateAsync(validatedData);

      if (!validation.valid) {
        toast.error(`Validation failed: ${validation.errors.join(", ")}`);
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
      console.error("Error generating resume:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error generating resume. Please try again.",
      );
    }
  };

  const handlePreview = async () => {
    try {
      if (!(await form.trigger())) return;
      const formData = generateResumeSchema.parse(form.getValues());
      await previewMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error generating preview. Please try again.",
      );
    }
  };

  if (dataLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/resumes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resumes
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Generate Resume</h1>
            <p className="text-muted-foreground">
              Loading your profile data...
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/resumes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resumes
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Generate Resume</h1>
            <p className="text-red-600">Error loading profile data</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>
                Failed to load profile data. Please try again or check your
                profile setup.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasMinimalData =
    resumeData?.profile &&
    (resumeData.workExperiences.length > 0 ||
      resumeData.education.length > 0 ||
      resumeData.skills.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {isGenerating && (
        <p role="status">
          {previewMutation.status === "queued"
            ? "Your resume is queued."
            : "Generating and checking layout…"}{" "}
          You can leave this page and return later.
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/resumes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resumes
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Generate Resume</h1>
          <p className="text-muted-foreground">
            Create a professional resume from your profile data
          </p>
        </div>
      </div>

      {!hasMinimalData && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent>
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Incomplete Profile</p>
                <p className="text-sm">
                  You need to complete your profile before generating a resume.{" "}
                  <Link href="/dashboard/profile" className="underline">
                    Complete your profile here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="flex flex-col gap-6">
          <form onSubmit={withAsyncHandler(handleSubmit(onSubmit))}>
            <Card>
              <CardHeader>
                <CardTitle>Resume Configuration</CardTitle>
                <CardDescription>
                  Customize your resume title and select which sections to
                  include
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">Resume Title</Label>
                  <Input
                    id="title"
                    {...register("title")}
                    placeholder="e.g., Software Engineer Resume"
                  />
                  <FormFieldError message={errors.title?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="template">Template</Label>
                  <select
                    id="template"
                    {...register("template")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="professional">Professional (LaTeX)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="targetPages">Page target</Label>
                  <select
                    id="targetPages"
                    {...register("targetPages", { valueAsNumber: true })}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value={1}>1 page</option>
                    <option value={2}>2 pages</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Wording is shortened and less relevant bullets may be
                    removed to fit. Your profile stays unchanged.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Content Sections</p>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includePersonalInfo"
                        checked={contentSelection.includePersonalInfo}
                        onCheckedChange={(checked) =>
                          setValue(
                            "contentSelection.includePersonalInfo",
                            !!checked,
                          )
                        }
                      />
                      <Label htmlFor="includePersonalInfo">
                        Personal Information
                      </Label>
                      {resumeData?.profile && (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeSummary"
                        checked={contentSelection.includeSummary}
                        onCheckedChange={(checked) =>
                          setValue("contentSelection.includeSummary", !!checked)
                        }
                      />
                      <Label htmlFor="includeSummary">
                        Professional Summary
                      </Label>
                      {resumeData?.profile?.professionalSummary && (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeWorkExperience"
                        checked={contentSelection.includeWorkExperience}
                        onCheckedChange={(checked) =>
                          setValue(
                            "contentSelection.includeWorkExperience",
                            !!checked,
                          )
                        }
                      />
                      <Label htmlFor="includeWorkExperience">
                        Work Experience
                      </Label>
                      {resumeData?.workExperiences &&
                        resumeData.workExperiences.length > 0 && (
                          <Badge variant="secondary">
                            {resumeData.workExperiences.length} items
                          </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeEducation"
                        checked={contentSelection.includeEducation}
                        onCheckedChange={(checked) =>
                          setValue(
                            "contentSelection.includeEducation",
                            !!checked,
                          )
                        }
                      />
                      <Label htmlFor="includeEducation">Education</Label>
                      {resumeData?.education &&
                        resumeData.education.length > 0 && (
                          <Badge variant="secondary">
                            {resumeData.education.length} items
                          </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeSkills"
                        checked={contentSelection.includeSkills}
                        onCheckedChange={(checked) =>
                          setValue("contentSelection.includeSkills", !!checked)
                        }
                      />
                      <Label htmlFor="includeSkills">Skills</Label>
                      {resumeData?.skills && resumeData.skills.length > 0 && (
                        <Badge variant="secondary">
                          {resumeData.skills.length} skills
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeProjects"
                        checked={contentSelection.includeProjects}
                        onCheckedChange={(checked) =>
                          setValue(
                            "contentSelection.includeProjects",
                            !!checked,
                          )
                        }
                      />
                      <Label htmlFor="includeProjects">Projects</Label>
                      {resumeData?.projects &&
                        resumeData.projects.length > 0 && (
                          <Badge variant="secondary">
                            {resumeData.projects.length} projects
                          </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeCertifications"
                        checked={contentSelection.includeCertifications}
                        onCheckedChange={(checked) =>
                          setValue(
                            "contentSelection.includeCertifications",
                            !!checked,
                          )
                        }
                      />
                      <Label htmlFor="includeCertifications">
                        Certifications
                      </Label>
                      {resumeData?.certifications &&
                        resumeData.certifications.length > 0 && (
                          <Badge variant="secondary">
                            {resumeData.certifications.length} certs
                          </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeAchievements"
                        checked={contentSelection.includeAchievements}
                        onCheckedChange={(checked) =>
                          setValue(
                            "contentSelection.includeAchievements",
                            !!checked,
                          )
                        }
                      />
                      <Label htmlFor="includeAchievements">Achievements</Label>
                      {resumeData?.achievements &&
                        resumeData.achievements.length > 0 && (
                          <Badge variant="secondary">
                            {resumeData.achievements.length} achievements
                          </Badge>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={withAsyncHandler(handlePreview)}
                    disabled={
                      !hasMinimalData ||
                      isGeneratingPreview ||
                      isValidating ||
                      isGenerating
                    }
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !hasMinimalData ||
                      isValidating ||
                      isGenerating ||
                      isGeneratingPreview
                    }
                  >
                    {isValidating || isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingPreview
                      ? "Generating and checking layout…"
                      : "Generate PDF"}
                  </Button>
                </div>

                {generationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 text-sm">{generationError}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Preview Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your resume will look before generating
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preview ? (
                <ResumePDFPreview result={preview} stale={stale} />
              ) : (
                <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click &quot;Preview&quot; to see your resume
                    </p>
                  </div>
                </div>
              )}

              {previewMutation.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">
                    Failed to generate preview: {previewMutation.error.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
