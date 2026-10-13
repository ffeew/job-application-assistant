import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { auth } from "@/lib/auth";
import { ResumeGenerationService } from "./service";
import { generateResumeSchema } from "../profile/validators";

const resumeGenerationService = new ResumeGenerationService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumeData = await resumeGenerationService.generateResumeData(
      session.user.id,
    );

    return NextResponse.json(resumeData);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch resume data");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = generateResumeSchema.parse(body);

    const validation = await resumeGenerationService.validateResumeGeneration(
      session.user.id,
      validatedData,
    );

    return NextResponse.json(validation);
  } catch (error) {
    return routeErrorResponse(error, "Failed to validate resume generation");
  }
}
