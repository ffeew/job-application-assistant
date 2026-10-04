import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationJob } from "../service";
import { generationErrorResponse } from "../../errors";

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
    return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return generationErrorResponse(error);
  }
}
