"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useCreateApplication } from "@/app/dashboard/applications/mutations/use-create-application";
import { createApplicationSchema } from "@/app/api/applications/validators";
import type { CreateApplicationRequest } from "@/app/api/applications/validators";

export default function NewApplicationPage() {
  const router = useRouter();
  const createApplicationMutation = useCreateApplication();

  const form = useForm({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: {
      company: "",
      position: "",
      jobDescription: "",
      location: "",
      jobUrl: "",
      salaryRange: "",
      status: "applied" as const,
      appliedAt: new Date().toISOString().split('T')[0],
      notes: "",
      contactEmail: "",
      contactName: "",
      recruiterId: "",
    },
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: unknown) => {
    // Data is validated by Zod resolver, safe to cast
    const validatedData = data as CreateApplicationRequest;
    
    createApplicationMutation.mutate(validatedData, {
      onSuccess: () => {
        toast.success("Application created successfully!");
        router.push("/dashboard/applications");
      },
      onError: (error) => {
        console.error("Error creating application:", error);
        toast.error("Error creating application. Please try again.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Job Application</h1>
          <p className="text-muted-foreground">
            Track a new job application.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Basic information about the job opportunity
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google"
                    {...register("company")}
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm mt-1">{errors.company.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Software Engineer"
                    {...register("position")}
                  />
                  {errors.position && (
                    <p className="text-red-500 text-sm mt-1">{errors.position.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., San Francisco, CA"
                    {...register("location")}
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="salaryRange">Salary Range</Label>
                  <Input
                    id="salaryRange"
                    placeholder="e.g., $100k - $130k"
                    {...register("salaryRange")}
                  />
                  {errors.salaryRange && (
                    <p className="text-red-500 text-sm mt-1">{errors.salaryRange.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="jobUrl">Job Posting URL</Label>
                <Input
                  id="jobUrl"
                  type="url"
                  placeholder="https://..."
                  {...register("jobUrl")}
                />
                {errors.jobUrl && (
                  <p className="text-red-500 text-sm mt-1">{errors.jobUrl.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Current status and dates
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="applied">Applied</SelectItem>
                          <SelectItem value="interviewing">Interviewing</SelectItem>
                          <SelectItem value="offer">Offer</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="appliedAt">Application Date</Label>
                  <Input
                    id="appliedAt"
                    type="date"
                    {...register("appliedAt")}
                  />
                  {errors.appliedAt && (
                    <p className="text-red-500 text-sm mt-1">{errors.appliedAt.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>
                Copy and paste the full job description (optional but recommended for AI features)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the job description here..."
                {...register("jobDescription")}
                rows={8}
              />
              {errors.jobDescription && (
                <p className="text-red-500 text-sm mt-1">{errors.jobDescription.message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                People you&apos;ve been in contact with regarding this application
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    placeholder="e.g., John Smith"
                    {...register("contactName")}
                  />
                  {errors.contactName && (
                    <p className="text-red-500 text-sm mt-1">{errors.contactName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="john@company.com"
                    {...register("contactEmail")}
                  />
                  {errors.contactEmail && (
                    <p className="text-red-500 text-sm mt-1">{errors.contactEmail.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="recruiterId">Recruiter ID/Name</Label>
                <Input
                  id="recruiterId"
                  placeholder="e.g., LinkedIn profile or name"
                  {...register("recruiterId")}
                />
                {errors.recruiterId && (
                  <p className="text-red-500 text-sm mt-1">{errors.recruiterId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Personal notes about this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes about this application, interview experiences, etc."
                {...register("notes")}
                rows={4}
              />
              {errors.notes && (
                <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/applications">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || createApplicationMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting || createApplicationMutation.isPending ? "Saving..." : "Save Application"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}