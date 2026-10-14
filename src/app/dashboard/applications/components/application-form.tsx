"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFieldError } from "@/components/ui/form-field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { withAsyncHandler } from "@/lib/async-action";
import { localDateInputValue } from "@/lib/format-date";
import { createApplicationSchema } from "@/app/api/applications/validators";
import type {
  ApplicationJsonResponse,
  CreateApplicationRequest,
} from "@/app/api/applications/validators";
import { FormSection } from "@/app/dashboard/components/form-section";
import { applicationStatuses, statusLabels } from "./status-mark";

interface ApplicationFormProps {
  application?: ApplicationJsonResponse;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (data: CreateApplicationRequest) => void;
}

// The applied date is a calendar day stored at UTC midnight, so its ISO string
// already starts with the day to show.
const savedDateInputValue = (value: string) => value.slice(0, 10);

export function ApplicationForm({
  application,
  submitLabel,
  isPending,
  onSubmit,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: {
      company: "",
      position: "",
      jobDescription: "",
      location: "",
      jobUrl: "",
      salaryRange: "",
      status: "applied" as const,
      appliedAt: application ? "" : localDateInputValue(),
      notes: "",
      contactEmail: "",
      contactName: "",
      recruiterId: "",
    },
  });

  useEffect(() => {
    if (application) {
      // Compiler memoization can reuse register() props; retain refs to update mounted inputs.
      reset(
        {
          company: application.company || "",
          position: application.position || "",
          jobDescription: application.jobDescription || "",
          location: application.location || "",
          jobUrl: application.jobUrl || "",
          salaryRange: application.salaryRange || "",
          status: application.status,
          appliedAt: application.appliedAt
            ? savedDateInputValue(application.appliedAt)
            : "",
          notes: application.notes || "",
          contactEmail: application.contactEmail || "",
          contactName: application.contactName || "",
          recruiterId: application.recruiterId || "",
        },
        { keepFieldsRef: true },
      );
    }
  }, [application, reset]);

  const submit = (data: unknown) => {
    // The Zod resolver has already validated and parsed this value.
    onSubmit(data as CreateApplicationRequest);
  };

  const busy = isSubmitting || isPending;

  return (
    <form onSubmit={withAsyncHandler(handleSubmit(submit))} noValidate>
      <FormSection
        title="The job"
        description="Company and position are required. The description is what a tailored resume is matched against."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              aria-required="true"
              aria-invalid={Boolean(errors.company)}
              {...register("company")}
            />
            <FormFieldError message={errors.company?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              aria-required="true"
              aria-invalid={Boolean(errors.position)}
              {...register("position")}
            />
            <FormFieldError message={errors.position?.message} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
            <FormFieldError message={errors.location?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="salaryRange">Salary range</Label>
            <Input
              id="salaryRange"
              placeholder="e.g. $100k to $130k"
              {...register("salaryRange")}
            />
            <FormFieldError message={errors.salaryRange?.message} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jobUrl">Listing URL</Label>
          <Input
            id="jobUrl"
            type="url"
            placeholder="https://"
            aria-invalid={Boolean(errors.jobUrl)}
            {...register("jobUrl")}
          />
          <FormFieldError message={errors.jobUrl?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            aria-describedby="jobDescription-hint"
            rows={8}
            className="min-h-48"
            {...register("jobDescription")}
          />
          <p id="jobDescription-hint" className="text-muted-foreground text-sm">
            Paste the listing text. Without it, a resume for this job can only
            be assembled by hand.
          </p>
          <FormFieldError message={errors.jobDescription?.message} />
        </div>
      </FormSection>

      <FormSection title="Progress">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    // Radix's native select can emit an empty value while reset synchronizes options.
                    if (value !== "") field.onChange(value);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormFieldError message={errors.status?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="appliedAt">Date applied</Label>
            <Input id="appliedAt" type="date" {...register("appliedAt")} />
            <FormFieldError message={errors.appliedAt?.message} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={4} {...register("notes")} />
          <FormFieldError message={errors.notes?.message} />
        </div>
      </FormSection>

      <FormSection
        title="Contact"
        description="Who you are dealing with at the company, if you know."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" {...register("contactName")} />
            <FormFieldError message={errors.contactName?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              aria-invalid={Boolean(errors.contactEmail)}
              {...register("contactEmail")}
            />
            <FormFieldError message={errors.contactEmail?.message} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recruiterId">Recruiter</Label>
          <Input
            id="recruiterId"
            placeholder="Name or profile link"
            {...register("recruiterId")}
          />
          <FormFieldError message={errors.recruiterId?.message} />
        </div>
      </FormSection>

      <div className="folder sticky bottom-0 -mx-5 flex justify-end gap-2 border-t px-5 py-3 sm:-mx-8 sm:px-8">
        <Button variant="outline" asChild>
          <Link href="/dashboard/applications">Cancel</Link>
        </Button>
        <Button type="submit" disabled={busy}>
          <Save />
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
