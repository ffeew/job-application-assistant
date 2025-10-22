import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResumeGenerationService } from "../service";
import { generateResumeSchema } from "../../profile/validators";

const resumeGenerationService = new ResumeGenerationService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = generateResumeSchema.parse(body);

    const html = await resumeGenerationService.generatePreviewHTML(
      session.user.id,
      validatedData,
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error generating resume preview:", error);
    return NextResponse.json(
      { error: "Failed to generate resume preview" },
      { status: 500 },
    );
  }
}
