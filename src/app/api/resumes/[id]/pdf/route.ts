import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResumesService } from "../../service";
import { parseGeneratedResume } from "@/lib/resume-document";
import { generateProfessionalResumeLatex } from "@/lib/resume-templates/professional-latex";
import { compileResumeLatex } from "@/lib/latex-compiler";
import { generationErrorResponse } from "@/app/api/resume-generation/errors";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const resume = await new ResumesService().getResumeById(
      session.user.id,
      id,
    );
    if (!resume)
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    const saved = parseGeneratedResume(resume.content);
    if (!saved)
      return NextResponse.json(
        { error: "Regenerate this legacy resume to export a LaTeX PDF." },
        { status: 422 },
      );
    const compiled = await compileResumeLatex(
      generateProfessionalResumeLatex(saved.document),
      AbortSignal.timeout(30000),
    );
    return new Response(Buffer.from(compiled.pdfBase64, "base64"), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${resume.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    return generationErrorResponse(error);
  }
}
