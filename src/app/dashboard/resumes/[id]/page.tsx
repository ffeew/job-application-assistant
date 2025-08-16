"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useResume, useUpdateResume } from "@/hooks/use-resumes";

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

export default function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const [title, setTitle] = useState("");
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  
  const router = useRouter();
  const { data: resume, isLoading: resumeLoading, error } = useResume(resolvedParams?.id || "");
  const updateResumeMutation = useUpdateResume();

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
      setTitle(resume.title);
      setIsDefault(resume.isDefault);
      
      const content: ResumeContent = JSON.parse(resume.content);
      setPersonalInfo(content.personalInfo || { name: "", email: "", phone: "", address: "" });
      setSummary(content.summary || "");
      setExperience(content.experience || "");
      setEducation(content.education || "");
      setSkills(content.skills || "");
      setLoading(false);
    }
  }, [resume]);

  // Handle error case
  useEffect(() => {
    if (error) {
      router.push("/dashboard/resumes");
    }
  }, [error, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (!title.trim()) {
      alert("Please enter a title for your resume");
      setSaving(false);
      return;
    }

    const resumeContent = {
      personalInfo,
      summary,
      experience,
      education,
      skills,
    };

    if (!resolvedParams?.id) return;

    updateResumeMutation.mutate({
      id: resolvedParams.id,
      data: {
        title,
        content: JSON.stringify(resumeContent),
        isDefault,
      }
    }, {
      onSuccess: () => {
        router.push("/dashboard/resumes");
      },
      onError: (error) => {
        console.error("Error updating resume:", error);
        alert("Error updating resume. Please try again.");
      },
      onSettled: () => {
        setSaving(false);
      },
    });
  };

  if (!resolvedParams || resumeLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Loading resume...</div>
      </div>
    );
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

      <form onSubmit={handleSave}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Resume Details</CardTitle>
              <CardDescription>
                Basic information about this resume
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Resume Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Software Engineer Resume"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <Label htmlFor="isDefault">Set as default resume</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={personalInfo.name}
                    onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={personalInfo.address}
                    onChange={(e) => setPersonalInfo({...personalInfo, address: e.target.value})}
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
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
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
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
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
                value={education}
                onChange={(e) => setEducation(e.target.value)}
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
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/resumes">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}