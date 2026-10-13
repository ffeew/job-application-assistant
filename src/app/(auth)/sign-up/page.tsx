import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { AuthPanel } from "../components/auth-panel";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  // The setting is read when the page is requested. A prerendered page would
  // keep whatever value the image was built with.
  await connection();

  if (env.DISABLE_SIGNUP) {
    return (
      <AuthPanel
        title="Registration is closed"
        description="New accounts are turned off on this server. Ask whoever runs it for access."
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </AuthPanel>
    );
  }

  return <SignUpForm />;
}
