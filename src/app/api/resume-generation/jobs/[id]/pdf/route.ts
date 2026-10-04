import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationJob } from "../../service";
import { generationErrorResponse } from "../../../errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const job = await getGenerationJob(session.user.id, id);
    if (!job)
      return NextResponse.json(
        { error: "Generation job not found" },
        { status: 404 },
      );
    if (job.status !== "completed" || !job.result)
      return NextResponse.json(
        { error: "The PDF is not ready." },
        { status: 409 },
      );
    return new Response(
      Uint8Array.from(Buffer.from(job.result.pdfBase64, "base64")),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="${job.payload.request.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        },
      },
    );
  } catch (error) {
    return generationErrorResponse(error);
  }
}
