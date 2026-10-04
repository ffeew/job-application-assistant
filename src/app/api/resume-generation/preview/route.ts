import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResumeGenerationService } from "../service";
import { generateResumeSchema } from "../../profile/validators";
import { generationErrorResponse } from "../errors";

export const maxDuration = 240;

const resumeGenerationService = new ResumeGenerationService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = generateResumeSchema.parse(body);

    const result = await resumeGenerationService.generateResume(
      session.user.id,
      validatedData,
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return generationErrorResponse(error);
  }
}
