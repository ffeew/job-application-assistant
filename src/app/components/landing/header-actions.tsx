"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/app/utils/authClient";
import { runAsyncAction } from "@/lib/async-action";
import { MobileMenu } from "./mobile-menu";

export function HeaderActions() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();
        setIsSignedIn(Boolean(session.data?.user));
      } catch {
        setIsSignedIn(false);
      }
    };

    runAsyncAction(checkSession());
  }, []);

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        {isSignedIn === null ? (
          <>
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </>
        ) : isSignedIn ? (
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Create account</Link>
            </Button>
          </>
        )}
      </div>
      <MobileMenu isSignedIn={isSignedIn} />
    </>
  );
}
