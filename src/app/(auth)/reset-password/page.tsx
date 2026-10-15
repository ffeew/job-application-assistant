"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/app/utils/authClient";
import { AuthPanel } from "../components/auth-panel";

const RESET_FAILED =
  "Couldn't reset the password. The link may have expired; request a new one.";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("The two passwords don't match.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError(RESET_FAILED);
      setIsLoading(false);
      return;
    }

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(RESET_FAILED);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(RESET_FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthPanel
        title="Password updated"
        description="Sign in with your new password."
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </AuthPanel>
    );
  }

  if (!token) {
    return (
      <AuthPanel
        title="This reset link doesn't work"
        description="It is incomplete or has expired. Request a new one to continue."
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Choose a new password"
      footer={
        <p>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      }
    >
      <form
        onSubmit={withAsyncHandler(handleSubmit)}
        className="flex flex-col gap-4"
      >
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p id="password-hint" className="text-muted-foreground text-sm">
            At least 8 characters.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={isLoading}
        >
          {isLoading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthPanel>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-12" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
