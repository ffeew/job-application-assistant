"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useCreateResume } from "@/app/dashboard/resumes/mutations/use-create-resume";
import type { CreateResumeRequest } from "@/app/api/resumes/validators";
import { PageHeader } from "@/app/dashboard/components/page-header";
import type { ResumeContent } from "@/lib/validators/resume-content";
import { toast } from "sonner";
import {
  emptyResumeForm,
  ManualResumeForm,
  type ResumeFormData,
} from "../components/manual-resume-form";

export default function NewResumePage() {
  const router = useRouter();
  const createResumeMutation = useCreateResume();

  const form = useForm<ResumeFormData>({ defaultValues: emptyResumeForm });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

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

    const resumeData: CreateResumeRequest = {
      title: data.title,
      content: JSON.stringify(resumeContent),
      isDefault: data.isDefault,
      isTailored: false,
    };

    createResumeMutation.mutate(resumeData, {
      onSuccess: () => {
        toast.success("Resume saved");
        router.push("/dashboard/resumes");
      },
      onError: (error) => {
        console.error("Error creating resume:", error);
        toast.error("Couldn't save the resume. Try again.");
      },
    });
  };

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Write a resume"
        description="Type a resume by hand. It is kept as text for cover letters and is not compiled into a PDF."
        back={{ href: "/dashboard/resumes", label: "Resumes" }}
      />
      <ManualResumeForm
        register={register}
        errors={errors}
        onSubmit={withAsyncHandler(handleSubmit(onSubmit))}
        isPending={isSubmitting || createResumeMutation.isPending}
        submitLabel="Save resume"
      />
    </div>
  );
}
