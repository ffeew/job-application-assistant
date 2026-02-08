"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useCreateResume } from "@/app/dashboard/resumes/mutations/use-create-resume";
import type { CreateResumeRequest } from "@/app/api/resumes/validators";
import { toast } from "sonner";

// Content structure for the resume
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

export default function NewResumePage() {
  const router = useRouter();
  const createResumeMutation = useCreateResume();

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: ResumeFormData) => {
    // Validate required fields manually since we can't use Zod for the nested structure
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

    const resumeData: CreateResumeRequest = {
      title: data.title,
      content: JSON.stringify(resumeContent),
      isDefault: data.isDefault,
      isTailored: false,
    };

    createResumeMutation.mutate(resumeData, {
      onSuccess: () => {
        toast.success("Resume created successfully!");
        router.push("/dashboard/resumes");
      },
      onError: (error) => {
        console.error("Error creating resume:", error);
        toast.error("Error creating resume. Please try again.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/resumes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resumes
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Create New Resume</h1>
          <p className="text-muted-foreground">
            Fill in your information to create a new resume.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <CardContent className="flex flex-col gap-2">
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
            <CardContent className="flex flex-col gap-2">
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
            <CardContent className="flex flex-col gap-2">
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
            <CardContent className="flex flex-col gap-2">
              <Textarea
                placeholder="• Programming Languages: Python, JavaScript, Java&#10;• Frameworks: React, Node.js, Django&#10;• Tools: Git, Docker, AWS&#10;• Soft Skills: Team Leadership, Communication, Problem Solving"
                {...register("skills")}
                rows={6}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard/resumes">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || createResumeMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting || createResumeMutation.isPending ? "Creating..." : "Create Resume"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
