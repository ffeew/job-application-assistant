import { connection } from "next/server";
import { env } from "@/lib/env";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  // The setting is read when the page is requested. A prerendered page would
  // keep whatever value the image was built with.
  await connection();

  return <SignInForm signUpOpen={!env.DISABLE_SIGNUP} />;
}
