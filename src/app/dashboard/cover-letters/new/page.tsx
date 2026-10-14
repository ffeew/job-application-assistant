"use client";
import {
  parseGeneratedResume,
  documentToResumeContent,
} from "@/lib/resume-document";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paper } from "@/components/ui/paper";
import { Loader2, PenLine, Save } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { LetterPage } from "../components/letter-page";
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

  const selectedResumeId = useCoverLetterStore((state) => state.selectedResume);
  const selectedApplication = useCoverLetterStore(
    (state) => state.selectedApplication,
  );
  const manualCompany = useCoverLetterStore((state) => state.manualCompany);
  const manualPosition = useCoverLetterStore((state) => state.manualPosition);
  const jobDescription = useCoverLetterStore((state) => state.jobDescription);
  const applicantName = useCoverLetterStore((state) => state.applicantName);
  const generatedContent = useCoverLetterStore(
    (state) => state.generatedContent,
  );
  const title = useCoverLetterStore((state) => state.title);

  const setSelectedResume = useCoverLetterStore(
    (state) => state.setSelectedResume,
  );
  const setSelectedApplication = useCoverLetterStore(
    (state) => state.setSelectedApplication,
  );
  const setManualFields = useCoverLetterStore((state) => state.setManualFields);
  const setApplicantName = useCoverLetterStore(
    (state) => state.setApplicantName,
  );
  const setTitle = useCoverLetterStore((state) => state.setTitle);
  const setGeneratedContent = useCoverLetterStore(
    (state) => state.setGeneratedContent,
  );
  const reset = useCoverLetterStore((state) => state.reset);

  const selectedResume =
    selectedResumeId ||
    resumes.find((resume) => resume.isDefault)?.id ||
    resumes[0]?.id ||
    "";

  const handleApplicationChange = (applicationId: string) => {
    if (applicationId === "none") {
      setSelectedApplication("");
      return;
    }
    setSelectedApplication(applicationId);
    const app = applications.find((a) => a.id === applicationId);
    if (app) {
      setManualFields(app.company, app.position, app.jobDescription || "");

      const tailoredResume = resumes.find(
        (r) => r.jobApplicationId === applicationId && r.isTailored,
      );
      if (tailoredResume) {
        setSelectedResume(tailoredResume.id);
      }
    }
  };

  const handleGenerateCoverLetter = () => {
    if (!manualCompany || !manualPosition) {
      toast.error("Enter the company and position first.");
      return;
    }

    const selectedResumeData = resumes.find((r) => r.id === selectedResume);
    let resumeContent: unknown = null;
    if (selectedResumeData) {
      try {
        const generated = parseGeneratedResume(selectedResumeData.content);
        resumeContent = generated
          ? documentToResumeContent(generated.document)
          : (JSON.parse(selectedResumeData.content) as unknown);
      } catch {
        // An unreadable resume is left out; the letter is still written.
      }
    }

    generateCoverLetterMutation.mutate(
      {
        company: manualCompany,
        position: manualPosition,
        jobDescription,
        resumeContent,
        applicantName,
      },
      {
        onSuccess: (data) => {
          setGeneratedContent(data.coverLetter);
          setTitle(`Cover letter for ${manualPosition} at ${manualCompany}`);
        },
        onError: (error: Error) => {
          toast.error(
            error.message || "Couldn't write the cover letter. Try again.",
          );
        },
      },
    );
  };

  const handleSaveCoverLetter = () => {
    if (!title || !generatedContent) {
      toast.error("Write the cover letter and give it a title first.");
      return;
    }

    createCoverLetterMutation.mutate(
      {
        title,
        content: generatedContent,
        jobApplicationId: selectedApplication || undefined,
        resumeId: selectedResume || undefined,
        isAiGenerated: true,
      },
      {
        onSuccess: () => {
          toast.success("Cover letter saved");
          reset();
          router.push("/dashboard/cover-letters");
        },
        onError: () => {
          toast.error("Couldn't save the cover letter. Try again.");
        },
      },
    );
  };

  const canWrite = Boolean(manualCompany && manualPosition);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Write cover letter"
        description="Drafted from the job and one of your resumes. Edit the wording before you save it."
        back={{ href: "/dashboard/cover-letters", label: "Cover letters" }}
      />

      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {applications.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="application">Application</Label>
              <Select
                value={selectedApplication}
                onValueChange={handleApplicationChange}
              >
                <SelectTrigger id="application" aria-describedby="application-hint">
                  <SelectValue placeholder="Choose an application" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None, I will type the job in</SelectItem>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.position} at {app.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="application-hint" className="text-muted-foreground text-sm">
                Optional. Fills in the job below and links the letter to it.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              aria-required="true"
              value={manualCompany}
              onChange={(e) =>
                setManualFields(e.target.value, manualPosition, jobDescription)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              aria-required="true"
              value={manualPosition}
              onChange={(e) =>
                setManualFields(manualCompany, e.target.value, jobDescription)
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="jobDescription">Job description</Label>
            <Textarea
              id="jobDescription"
              aria-describedby="jobDescription-hint"
              value={jobDescription}
              onChange={(e) =>
                setManualFields(manualCompany, manualPosition, e.target.value)
              }
              rows={6}
              className="max-h-72"
            />
            <p id="jobDescription-hint" className="text-muted-foreground text-sm">
              Paste the listing so the letter can answer it.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="applicantName">Your name</Label>
            <Input
              id="applicantName"
              autoComplete="name"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="resume">Resume to draw on</Label>
            {resumes.length > 0 ? (
              <Select value={selectedResume} onValueChange={setSelectedResume}>
                <SelectTrigger id="resume">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground text-sm">
                You have no resumes yet, so the letter will be written from the
                job alone.{" "}
                <Link
                  href="/dashboard/resumes/generate"
                  className="text-link underline underline-offset-4 hover:no-underline"
                >
                  Generate a resume
                </Link>
              </p>
            )}
          </div>

          <Button
            onClick={handleGenerateCoverLetter}
            disabled={generateCoverLetterMutation.isPending || !canWrite}
            size="lg"
            className="mt-2 w-full"
          >
            {generateCoverLetterMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <PenLine />
            )}
            {generateCoverLetterMutation.isPending
              ? "Writing…"
              : "Write cover letter"}
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {generatedContent ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <LetterPage
                aria-label="Cover letter text"
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
              />
              <Button
                onClick={handleSaveCoverLetter}
                disabled={createCoverLetterMutation.isPending}
                className="w-fit self-end"
              >
                <Save />
                {createCoverLetterMutation.isPending
                  ? "Saving…"
                  : "Save cover letter"}
              </Button>
            </>
          ) : (
            <Paper className="flex min-h-[26rem] items-center justify-center p-10 text-center font-sans">
              <p
                role={generateCoverLetterMutation.isPending ? "status" : undefined}
                className="text-paper-foreground/70 max-w-[34ch] text-sm"
              >
                {generateCoverLetterMutation.isPending
                  ? "Writing your letter. This usually takes a few seconds."
                  : "Your letter appears here. Enter the company and position, then select Write cover letter."}
              </p>
            </Paper>
          )}
        </div>
      </div>
    </div>
  );
}
