"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useResume } from "@/app/dashboard/resumes/queries/use-resumes";
import { useUpdateResume } from "@/app/dashboard/resumes/mutations/use-update-resume";
import type { UpdateResumeRequest } from "@/app/api/resumes/validators";
import { toast } from "sonner";
import { ResumeDetailSkeleton } from "../components/resume-detail-skeleton";

interface ResumeContent {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

// Form data structure
interface ResumeFormData {
  title: string;
  isDefault: boolean;
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

export default function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  
  const router = useRouter();
  const { data: resume, isLoading: resumeLoading, error } = useResume(resolvedParams?.id || "");
  const updateResumeMutation = useUpdateResume();

  const form = useForm<ResumeFormData>({
    defaultValues: {
      title: "",
      isDefault: false,
      personalInfo: {
        name: "",
        email: "",
        phone: "",
        address: "",
      },
      summary: "",
      experience: "",
      education: "",
      skills: "",
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  // Resolve params Promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  // Populate form when resume data is loaded
  useEffect(() => {
    if (resume) {
      let content: ResumeContent;
      try {
        content = JSON.parse(resume.content);
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
      reset({
        title: resume.title,
        isDefault: resume.isDefault,
        personalInfo: content.personalInfo || { name: "", email: "", phone: "", address: "" },
        summary: content.summary || "",
        experience: content.experience || "",
        education: content.education || "",
        skills: content.skills || "",
      });
      setLoading(false);
    }
  }, [resume, reset]);

  // Handle error case
  useEffect(() => {
    if (error) {
      router.push("/dashboard/resumes");
    }
  }, [error, router]);

  const onSubmit = async (data: ResumeFormData) => {
    // Validate required fields
    if (!data.title.trim()) {
      toast.error("Please enter a title for your resume");
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

    updateResumeMutation.mutate({
      id: resolvedParams.id,
      data: updateData
    }, {
      onSuccess: () => {
        toast.success("Resume updated successfully!");
        router.push("/dashboard/resumes");
      },
      onError: (error) => {
        console.error("Error updating resume:", error);
        toast.error("Error updating resume. Please try again.");
      },
    });
  };

  if (!resolvedParams || resumeLoading || loading) {
    return <ResumeDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/resumes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resumes
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Resume</h1>
          <p className="text-muted-foreground">
            Update your resume information.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Resume Details</CardTitle>
              <CardDescription>
                Basic information about this resume
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Resume Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Software Engineer Resume"
                  {...register("title", { required: "Title is required" })}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  {...register("isDefault")}
                />
                <Label htmlFor="isDefault">Set as default resume</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...register("personalInfo.name")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("personalInfo.email")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...register("personalInfo.phone")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register("personalInfo.address")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
              <CardDescription>
                Brief overview of your background and career objectives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write a brief summary of your professional background..."
                {...register("summary")}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Experience</CardTitle>
              <CardDescription>
                List your work experience, starting with the most recent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Job Title - Company Name (Start Date - End Date)&#10;• Responsibility or achievement&#10;• Another responsibility or achievement&#10;&#10;Previous Job Title - Previous Company..."
                {...register("experience")}
                rows={8}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
              <CardDescription>
                Your educational background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Degree - School Name (Graduation Year)&#10;Relevant coursework, honors, or achievements..."
                {...register("education")}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                Technical and soft skills relevant to your career
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="• Programming Languages: Python, JavaScript, Java&#10;• Frameworks: React, Node.js, Django&#10;• Tools: Git, Docker, AWS&#10;• Soft Skills: Team Leadership, Communication, Problem Solving"
                {...register("skills")}
                rows={6}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/resumes">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || updateResumeMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting || updateResumeMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}