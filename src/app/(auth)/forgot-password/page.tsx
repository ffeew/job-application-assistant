"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/app/utils/authClient";
import { AuthPanel } from "../components/auth-panel";

const SEND_FAILED = "Couldn't send the reset email. Check the address and try again.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`, // Password-reset emails need an absolute URL.
      });

      if (result.error) {
        setError(SEND_FAILED);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(SEND_FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthPanel
        title="Check your email"
        footer={
          <p>
            <Link href="/sign-in">Back to sign in</Link>
          </p>
        }
      >
        <Notice tone="success" role="status">
          We sent a reset link to {email}. Open it to choose a new password. If
          it doesn&apos;t arrive, check your spam folder.
        </Notice>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a reset link."
      footer={
        <p>
          Remembered it? <Link href="/sign-in">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={withAsyncHandler(handleSubmit)} className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthPanel>
  );
}
