import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResumesService } from "../../service";
import { parseGeneratedResume } from "@/lib/resume-document";
import { generateProfessionalResumeLatex } from "@/lib/resume-templates/professional-latex";
import { compileResumeLatex } from "@/lib/latex-compiler";
import { generationErrorResponse } from "@/app/api/resume-generation/errors";
import { discardFile, readFile, storeResumePdf } from "@/app/api/stored-files";

export const maxDuration = 60;

const resumesService = new ResumesService();

function pdfResponse(pdf: Uint8Array<ArrayBuffer>, title: string) {
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const userId = session.user.id;
    const resume = await resumesService.getResumeForPdf(userId, id);
    if (!resume)
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });

    // The stored file is the PDF as it was generated. Compiling the snapshot
    // again can differ once the template or the compiler image has changed.
    const stored = resume.pdfKey ? await readFile(resume.pdfKey) : null;
    if (stored?.state === "found") {
      return pdfResponse(stored.bytes, resume.title);
    }

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
    const pdf = Buffer.from(compiled.pdfBase64, "base64");

    // A resume saved before PDFs were kept, or whose file is gone, keeps this
    // one from now on. An unreachable store may still hold the original, so
    // the record is left pointing at it.
    if (stored?.state !== "unavailable") {
      const key = await storeResumePdf(userId, pdf);
      if (key && !(await resumesService.attachPdf(userId, id, key, resume))) {
        await discardFile(key);
      }
    }
    return pdfResponse(pdf, resume.title);
  } catch (error) {
    return generationErrorResponse(error);
  }
}
