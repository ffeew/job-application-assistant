"use client";

import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFieldError } from "@/components/ui/form-field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/app/dashboard/components/form-section";
import type { ResumeContent } from "@/lib/validators/resume-content";

export interface ResumeFormData extends ResumeContent {
  title: string;
  isDefault: boolean;
}

export const emptyResumeForm: ResumeFormData = {
  title: "",
  isDefault: false,
  personalInfo: { name: "", email: "", phone: "", address: "" },
  summary: "",
  experience: "",
  education: "",
  skills: "",
};

interface ManualResumeFormProps {
  register: UseFormRegister<ResumeFormData>;
  errors: FieldErrors<ResumeFormData>;
  onSubmit: React.SubmitEventHandler<HTMLFormElement>;
  isPending: boolean;
  submitLabel: string;
}

export function ManualResumeForm({
  register,
  errors,
  onSubmit,
  isPending,
  submitLabel,
}: ManualResumeFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <FormSection title="Details">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Resume title</Label>
          <Input
            id="title"
            aria-invalid={Boolean(errors.title)}
            {...register("title", { required: "Give the resume a title." })}
          />
          <FormFieldError message={errors.title?.message} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            className="size-[18px]"
            {...register("isDefault")}
          />
          <Label htmlFor="isDefault">Use as my default resume</Label>
        </div>
      </FormSection>

      <FormSection title="Personal information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...register("personalInfo.name")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("personalInfo.email")} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("personalInfo.phone")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("personalInfo.address")} />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Content"
        description="Written by hand, exactly as it should read. A generated resume pulls this from your profile instead."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="summary">Professional summary</Label>
          <Textarea id="summary" rows={4} {...register("summary")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="experience">Work experience</Label>
          <Textarea
            id="experience"
            aria-describedby="experience-hint"
            rows={8}
            className="min-h-48"
            {...register("experience")}
          />
          <p id="experience-hint" className="text-muted-foreground text-sm">
            Most recent first. Put the title, company and dates on one line,
            then one line per achievement.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="education">Education</Label>
          <Textarea id="education" rows={4} {...register("education")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="skills">Skills</Label>
          <Textarea id="skills" rows={5} {...register("skills")} />
        </div>
      </FormSection>

      <div className="folder sticky bottom-0 -mx-5 flex justify-end gap-2 border-t px-5 py-3 sm:-mx-8 sm:px-8">
        <Button variant="outline" asChild>
          <Link href="/dashboard/resumes">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          <Save />
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
