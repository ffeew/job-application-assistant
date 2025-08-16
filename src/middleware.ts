import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for a protected route (dashboard or API)
  if (pathname.startsWith("/dashboard") || (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))) {
    try {
      // Properly validate the session server-side
      const session = await auth.api.getSession({
        headers: request.headers
      });

      if (!session) {
        // For API routes, return 401 Unauthorized
        if (pathname.startsWith("/api")) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }
        // For dashboard routes, redirect to sign-in
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    } catch (error) {
      // If session validation fails
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all dashboard routes
    "/dashboard/:path*",
    // Protect API routes (except auth endpoints)
    "/api/((?!auth).)*",
  ],
};