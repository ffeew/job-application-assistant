"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Save } from "lucide-react";
import Link from "next/link";
import { useResumes } from "@/app/dashboard/resumes/queries/use-resumes";
import { useApplications } from "@/app/dashboard/applications/queries/use-applications";
import { useCreateCoverLetter } from "@/app/dashboard/cover-letters/mutations/use-create-cover-letter";
import { useGenerateCoverLetter } from "@/app/dashboard/cover-letters/mutations/use-generate-cover-letter";
import { useCoverLetterStore } from "@/app/dashboard/cover-letters/store/use-cover-letter-store";
import { toast } from "sonner";

export default function NewCoverLetterPage() {
  const router = useRouter();
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useApplications();
  const generateCoverLetterMutation = useGenerateCoverLetter();
  const createCoverLetterMutation = useCreateCoverLetter();

  // Zustand store selectors
  const selectedResume = useCoverLetterStore((state) => state.selectedResume);
  const selectedApplication = useCoverLetterStore((state) => state.selectedApplication);
  const manualCompany = useCoverLetterStore((state) => state.manualCompany);
  const manualPosition = useCoverLetterStore((state) => state.manualPosition);
  const jobDescription = useCoverLetterStore((state) => state.jobDescription);
  const applicantName = useCoverLetterStore((state) => state.applicantName);
  const generatedContent = useCoverLetterStore((state) => state.generatedContent);
  const title = useCoverLetterStore((state) => state.title);

  // Zustand store actions
  const setSelectedResume = useCoverLetterStore((state) => state.setSelectedResume);
  const setSelectedApplication = useCoverLetterStore((state) => state.setSelectedApplication);
  const setManualFields = useCoverLetterStore((state) => state.setManualFields);
  const setApplicantName = useCoverLetterStore((state) => state.setApplicantName);
  const setTitle = useCoverLetterStore((state) => state.setTitle);
  const setGeneratedContent = useCoverLetterStore((state) => state.setGeneratedContent);
  const reset = useCoverLetterStore((state) => state.reset);

  // Set default resume when resumes are loaded
  useEffect(() => {
    if (resumes.length > 0 && !selectedResume) {
      const defaultResume = resumes.find((r: { isDefault: boolean }) => r.isDefault) || resumes[0];
      setSelectedResume(defaultResume.id);
    }
  }, [resumes, selectedResume, setSelectedResume]);

  const handleApplicationChange = (applicationId: string) => {
    setSelectedApplication(applicationId);
    if (applicationId) {
      const app = applications.find(a => a.id === applicationId);
      if (app) {
        setManualFields(app.company, app.position, app.jobDescription || "");
      }
    }
  };

  const handleGenerateCoverLetter = () => {
    if (!manualCompany || !manualPosition) {
      toast.error("Please provide company and position information");
      return;
    }

    const selectedResumeData = resumes.find(r => r.id === selectedResume);
    let resumeContent = null;
    if (selectedResumeData) {
      try {
        resumeContent = JSON.parse(selectedResumeData.content);
      } catch {
        console.error("Failed to parse resume content");
      }
    }

    generateCoverLetterMutation.mutate({
      company: manualCompany,
      position: manualPosition,
      jobDescription,
      resumeContent,
      applicantName,
    }, {
      onSuccess: (data) => {
        setGeneratedContent(data.coverLetter);
        setTitle(`Cover Letter - ${manualCompany} ${manualPosition}`);
      },
      onError: (error: Error) => {
        console.error("Error generating cover letter:", error);
        toast.error(error.message || "Error generating cover letter. Please try again.");
      },
    });
  };

  const handleSaveCoverLetter = () => {
    if (!title || !generatedContent) {
      toast.error("Please generate a cover letter first");
      return;
    }

    createCoverLetterMutation.mutate({
      title,
      content: generatedContent,
      jobApplicationId: selectedApplication || undefined,
      resumeId: selectedResume || undefined,
      isAiGenerated: true,
    }, {
      onSuccess: () => {
        toast.success("Cover letter saved successfully!");
        reset(); // Clear the store after successful save
        router.push("/dashboard/cover-letters");
      },
      onError: (error) => {
        console.error("Error saving cover letter:", error);
        toast.error("Error saving cover letter. Please try again.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/cover-letters">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cover Letters
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Generate Cover Letter</h1>
          <p className="text-muted-foreground">
            Create a personalized cover letter using AI.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
              <CardDescription>
                Select an existing application or enter job details manually
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {applications.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>Select Application (Optional)</Label>
                  <Select value={selectedApplication} onValueChange={handleApplicationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an existing application..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None - Enter manually</SelectItem>
                      {applications.map(app => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.position} at {app.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    placeholder="Company name"
                    value={manualCompany}
                    onChange={(e) => setManualFields(e.target.value, manualPosition, jobDescription)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    placeholder="Job position"
                    value={manualPosition}
                    onChange={(e) => setManualFields(manualCompany, e.target.value, jobDescription)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="applicantName">Your Name (Optional)</Label>
                <Input
                  id="applicantName"
                  placeholder="Your full name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the job description here for better personalization..."
                  value={jobDescription}
                  onChange={(e) => setManualFields(manualCompany, manualPosition, e.target.value)}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume Selection</CardTitle>
              <CardDescription>
                Choose which resume to base the cover letter on
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resumes.length > 0 ? (
                <Select value={selectedResume} onValueChange={setSelectedResume}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map(resume => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No resumes found. <Link href="/dashboard/resumes/new" className="text-primary hover:underline">Create one first</Link>.
                </p>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerateCoverLetter}
            disabled={generateCoverLetterMutation.isPending || !manualCompany || !manualPosition}
            size="lg"
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generateCoverLetterMutation.isPending ? "Generating..." : "Generate Cover Letter"}
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Cover Letter</CardTitle>
              <CardDescription>
                Review and edit your AI-generated cover letter
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {generatedContent ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Cover letter title"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      rows={16}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button onClick={handleSaveCoverLetter} disabled={createCoverLetterMutation.isPending} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {createCoverLetterMutation.isPending ? "Saving..." : "Save Cover Letter"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Generate a cover letter to see it here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
