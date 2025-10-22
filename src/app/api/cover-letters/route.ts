import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CoverLettersService } from "./service";
import {
  coverLettersQuerySchema,
  createCoverLetterSchema,
} from "./validators";

const coverLettersService = new CoverLettersService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = coverLettersQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validatedQuery.error.issues,
        },
        { status: 400 },
      );
    }

    const coverLetters = await coverLettersService.getCoverLetters(
      session.user.id,
      validatedQuery.data,
    );

    return NextResponse.json(coverLetters);
  } catch (error) {
    console.error("Error fetching cover letters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCoverLetterSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validatedData.error.issues,
        },
        { status: 400 },
      );
    }

    const coverLetter = await coverLettersService.createCoverLetter(
      session.user.id,
      validatedData.data,
    );

    return NextResponse.json(coverLetter, { status: 201 });
  } catch (error) {
    console.error("Error creating cover letter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
