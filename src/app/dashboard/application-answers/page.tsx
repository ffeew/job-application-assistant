"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  ClipboardCopy,
  Loader2,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { useApplications } from "@/app/dashboard/applications/queries/use-applications";
import { useUserProfile } from "@/app/dashboard/profile/queries/use-user-profile";
import { draftAnswersRequestSchema } from "@/app/api/application-answers/validators";
import { useDraftApplicationAnswers } from "./mutations/use-draft-application-answers";
import { useApplicationAnswersStore } from "./store/use-application-answers-store";

export default function ApplicationAnswersPage() {
  const applicationId = useApplicationAnswersStore(
    (state) => state.applicationId,
  );
  const questions = useApplicationAnswersStore((state) => state.questions);
  const answers = useApplicationAnswersStore((state) => state.answers);
  const setApplicationId = useApplicationAnswersStore(
    (state) => state.setApplicationId,
  );
  const setQuestions = useApplicationAnswersStore(
    (state) => state.setQuestions,
  );
  const setAnswers = useApplicationAnswersStore((state) => state.setAnswers);
  const setAnswer = useApplicationAnswersStore((state) => state.setAnswer);
  const reset = useApplicationAnswersStore((state) => state.reset);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const draftAnswers = useDraftApplicationAnswers();
  const { data: applications = [] } = useApplications();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = draftAnswersRequestSchema.safeParse({
      applicationId: applicationId || undefined,
      questions,
    });
    if (!request.success) {
      toast.error(
        request.error.issues[0]?.message ?? "Check the questions, then retry.",
      );
      return;
    }

    draftAnswers.mutate(request.data, {
      onSuccess: (data) => {
        setAnswers(data.answers);
        setCopiedIndex(null);
        if (data.answers.length) toast.success("Answers drafted");
        else toast.error("No questions found. Paste the form's questions.");
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Couldn't draft the answers. Try again.",
        );
      },
    });
  };

  const handleCopy = async (index: number) => {
    const answer = answers[index]?.answer;
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedIndex(index);
      toast.success("Answer copied");
      setTimeout(
        () => setCopiedIndex((current) => (current === index ? null : current)),
        2000,
      );
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Application questions"
        description="Paste the questions from an application form. Answers are drafted from your profile and the job; check each one, then copy it into the form."
      />

      {profileLoading ? (
        <Skeleton className="h-12" />
      ) : userProfile ? (
        <Notice>
          Answers use only what your saved profile says.{" "}
          <Link href="/dashboard/profile">Update your profile</Link> to fill a
          gap.
        </Notice>
      ) : (
        <Notice tone="warning" title="No profile yet">
          Without it there is nothing to answer from.{" "}
          <Link href="/dashboard/profile">Add your background</Link> first.
        </Notice>
      )}

      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-2">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {applications.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="application">Application</Label>
              <Select
                value={applicationId || "none"}
                onValueChange={(value) =>
                  setApplicationId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger
                  id="application"
                  aria-describedby="application-hint"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No saved job</SelectItem>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.position} at {app.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p
                id="application-hint"
                className="text-muted-foreground text-sm"
              >
                Optional. Lets answers speak to this job.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="questions">Questions *</Label>
            <Textarea
              id="questions"
              aria-required="true"
              aria-describedby="questions-hint"
              value={questions}
              onChange={(event) => setQuestions(event.target.value)}
              rows={12}
              className="min-h-64"
            />
            <p id="questions-hint" className="text-muted-foreground text-sm">
              Copy a page of the form and paste it here. Options, hints and
              &ldquo;Required&rdquo; markers can stay in.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={draftAnswers.isPending}>
              {draftAnswers.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <PenLine />
              )}
              {draftAnswers.isPending ? "Drafting…" : "Draft answers"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setCopiedIndex(null);
              }}
              disabled={draftAnswers.isPending}
            >
              <RotateCcw />
              Clear
            </Button>
          </div>
        </form>

        <section
          aria-labelledby="answers-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="answers-heading" className="text-sm font-medium">
            Answers
          </h2>
          {answers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              The answers appear here, one per question.
            </p>
          ) : (
            <Card layout="flush" className="flex flex-col gap-6 p-6">
              {answers.map((item, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Label htmlFor={`answer-${String(index)}`}>
                    {item.question}
                  </Label>
                  {item.reason && (
                    <Notice
                      tone="warning"
                      id={`answer-${String(index)}-reason`}
                    >
                      {item.reason}
                    </Notice>
                  )}
                  <Textarea
                    id={`answer-${String(index)}`}
                    aria-describedby={
                      item.reason ? `answer-${String(index)}-reason` : undefined
                    }
                    value={item.answer}
                    onChange={(event) => setAnswer(index, event.target.value)}
                    rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit self-end"
                    onClick={withAsyncHandler(() => handleCopy(index))}
                    disabled={!item.answer}
                  >
                    {copiedIndex === index ? <Check /> : <ClipboardCopy />}
                    {copiedIndex === index ? "Copied" : "Copy answer"}
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
