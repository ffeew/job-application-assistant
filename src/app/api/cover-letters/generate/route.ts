import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { limitAiRequest } from "@/app/api/ai-rate-limit";
import { CoverLettersService } from "../service";
import { generateCoverLetterSchema } from "../validators";

const coverLettersService = new CoverLettersService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = limitAiRequest("coverLetter", session.user.id);
    if (limited) return limited;

    const body: unknown = await request.json();
    const validatedData = generateCoverLetterSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validatedData.error.issues,
        },
        { status: 400 },
      );
    }

    const result = await coverLettersService.generateCoverLetter(
      validatedData.data,
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "Error generating cover letter");
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes("not configured") ? 503 : 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
