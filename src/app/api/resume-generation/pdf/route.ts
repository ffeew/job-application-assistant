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

    const pdfBuffer = await resumeGenerationService.generateResumePDF(
      session.user.id,
      validatedData,
    );

    return new Response(Uint8Array.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${validatedData.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating resume PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate resume PDF" },
      { status: 500 },
    );
  }
}
