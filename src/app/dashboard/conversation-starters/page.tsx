"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateConversationStarter } from "./mutations/use-generate-conversation-starter";
import { toast } from "sonner";
import {
  Check,
  ClipboardCopy,
  Loader2,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { useUserProfile } from "@/app/dashboard/profile/queries/use-user-profile";

type FormState = {
  prospectDetails: string;
  additionalContext: string;
};

const initialState: FormState = {
  prospectDetails: "",
  additionalContext: "",
};

export default function ConversationStartersPage() {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const generateConversationStarter = useGenerateConversationStarter();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();

  const handleChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleReset = () => {
    setFormState(initialState);
    setGeneratedMessage("");
    setCopied(false);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopied(false);

    if (
      !formState.prospectDetails ||
      formState.prospectDetails.trim().length < 20
    ) {
      toast.error("Add a little more about who you're writing to.");
      return;
    }

    generateConversationStarter.mutate(
      {
        ...formState,
      },
      {
        onSuccess: (data) => {
          setGeneratedMessage(data.message);
          toast.success("Message ready");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Couldn't write the message. Try again.",
          );
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!generatedMessage) return;
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      toast.success("Message copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };

  const profileName = [userProfile?.firstName, userProfile?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Conversation starters"
        description="A short first message to someone at a company, written from what you know about them and your profile."
      />

      {profileLoading ? (
        <Skeleton className="h-12" />
      ) : userProfile ? (
        <Notice>
          Your saved profile{profileName ? ` (${profileName})` : ""} is used to
          introduce you.{" "}
          <Link href="/dashboard/profile">Update your profile</Link> if
          something looks off.
        </Notice>
      ) : (
        <Notice tone="warning" title="No profile yet">
          Without it the message can&apos;t say who you are.{" "}
          <Link href="/dashboard/profile">Add your background</Link> first.
        </Notice>
      )}

      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-2">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prospectDetails">Who are you writing to? *</Label>
            <Textarea
              id="prospectDetails"
              aria-required="true"
              aria-describedby="prospectDetails-hint"
              value={formState.prospectDetails}
              onChange={handleChange("prospectDetails")}
              rows={10}
              className="min-h-56"
            />
            <p
              id="prospectDetails-hint"
              className="text-muted-foreground text-sm"
            >
              Paste what you know: their role and company, where you met,
              something they wrote or built.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="additionalContext">Anything else to mention</Label>
            <Textarea
              id="additionalContext"
              aria-describedby="additionalContext-hint"
              value={formState.additionalContext}
              onChange={handleChange("additionalContext")}
              rows={4}
            />
            <p
              id="additionalContext-hint"
              className="text-muted-foreground text-sm"
            >
              Optional. Mutual contacts, earlier conversations, what you want to
              ask.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              disabled={generateConversationStarter.isPending}
            >
              {generateConversationStarter.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <PenLine />
              )}
              {generateConversationStarter.isPending
                ? "Writing…"
                : "Write message"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={generateConversationStarter.isPending}
            >
              <RotateCcw />
              Clear
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <Label htmlFor="generatedMessage">Message</Label>
          <Textarea
            id="generatedMessage"
            aria-describedby="generatedMessage-hint"
            className="min-h-72"
            value={generatedMessage}
            onChange={(event) => setGeneratedMessage(event.target.value)}
          />
          <p
            id="generatedMessage-hint"
            className="text-muted-foreground text-sm"
          >
            The message appears here. Edit it before you send it.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-fit self-end"
            onClick={withAsyncHandler(handleCopy)}
            disabled={!generatedMessage}
          >
            {copied ? <Check /> : <ClipboardCopy />}
            {copied ? "Copied" : "Copy message"}
          </Button>
        </div>
      </div>
    </div>
  );
}
