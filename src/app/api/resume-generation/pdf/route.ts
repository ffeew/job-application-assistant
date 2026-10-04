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

    const pdfBuffer = await resumeGenerationService.generateResumePDF(
      session.user.id,
      validatedData,
    );

    return new Response(Uint8Array.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${validatedData.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return generationErrorResponse(error);
  }
}
