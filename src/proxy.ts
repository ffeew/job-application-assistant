import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", env.BETTER_AUTH_URL));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all dashboard routes
    "/dashboard/:path*",
  ],
};
