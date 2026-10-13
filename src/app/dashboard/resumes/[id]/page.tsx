"use client";

import { runAsyncAction, withAsyncHandler } from "@/lib/async-action";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useResume } from "@/app/dashboard/resumes/queries/use-resumes";
import { useUpdateResume } from "@/app/dashboard/resumes/mutations/use-update-resume";
import type { UpdateResumeRequest } from "@/app/api/resumes/validators";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { Notice } from "@/components/ui/notice";
import { toast } from "sonner";
import { ResumeDetailSkeleton } from "../components/resume-detail-skeleton";
import {
  resumeContentSchema,
  type ResumeContent,
} from "@/lib/validators/resume-content";
import { parseGeneratedResume } from "@/lib/resume-document";
import {
  emptyResumeForm,
  ManualResumeForm,
  type ResumeFormData,
} from "../components/manual-resume-form";
import {
  StoredResumeView,
  legacyResumeHTML,
} from "../components/stored-resume-view";

export default function EditResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null,
  );

  const router = useRouter();
  const {
    data: resume,
    isLoading: resumeLoading,
    error,
  } = useResume(resolvedParams?.id || "");
  const updateResumeMutation = useUpdateResume();

  const form = useForm<ResumeFormData>({ defaultValues: emptyResumeForm });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    runAsyncAction(resolveParams());
  }, [params]);

  useEffect(() => {
    if (resume) {
      let content: ResumeContent;
      try {
        const raw: unknown = JSON.parse(resume.content);
        content = resumeContentSchema.parse(raw);
      } catch {
        console.error("Failed to parse resume content");
        content = {
          personalInfo: { name: "", email: "", phone: "", address: "" },
          summary: "",
          experience: "",
          education: "",
          skills: "",
        };
      }
      // Compiler memoization can reuse register() props; retain refs to update mounted inputs.
      reset(
        {
          title: resume.title,
          isDefault: resume.isDefault,
          personalInfo: content.personalInfo,
          summary: content.summary || "",
          experience: content.experience || "",
          education: content.education || "",
          skills: content.skills || "",
        },
        { keepFieldsRef: true },
      );
    }
  }, [resume, reset]);

  const onSubmit = (data: ResumeFormData) => {
    if (!data.title.trim()) {
      toast.error("Give the resume a title before saving.");
      return;
    }

    const resumeContent: ResumeContent = {
      personalInfo: data.personalInfo,
      summary: data.summary,
      experience: data.experience,
      education: data.education,
      skills: data.skills,
    };

    if (!resolvedParams?.id) return;

    const updateData: UpdateResumeRequest = {
      title: data.title,
      content: JSON.stringify(resumeContent),
      isDefault: data.isDefault,
    };

    updateResumeMutation.mutate(
      {
        id: resolvedParams.id,
        data: updateData,
      },
      {
        onSuccess: () => {
          toast.success("Changes saved");
          router.push("/dashboard/resumes");
        },
        onError: (error) => {
          console.error("Error updating resume:", error);
          toast.error("Couldn't save the changes. Try again.");
        },
      },
    );
  };

  if (!resolvedParams || resumeLoading) {
    return <ResumeDetailSkeleton />;
  }

  if (error || !resume) {
    return (
      <div className="flex max-w-4xl flex-col gap-8">
        <PageHeader
          title="Resume"
          back={{ href: "/dashboard/resumes", label: "Resumes" }}
        />
        <Notice tone="error" title="This resume didn't load">
          It may have been deleted, or the server could not be reached. Go back
          to your resumes and open it again.
        </Notice>
      </div>
    );
  }

  if (
    parseGeneratedResume(resume.content) ||
    legacyResumeHTML(resume.content)
  ) {
    return <StoredResumeView key={resume.id} resume={resume} />;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Edit resume"
        description="A resume written by hand. It is kept as text for cover letters and is not compiled into a PDF."
        back={{ href: "/dashboard/resumes", label: "Resumes" }}
      />
      <ManualResumeForm
        register={register}
        errors={errors}
        onSubmit={withAsyncHandler(handleSubmit(onSubmit))}
        isPending={isSubmitting || updateResumeMutation.isPending}
        submitLabel="Save changes"
      />
    </div>
  );
}
