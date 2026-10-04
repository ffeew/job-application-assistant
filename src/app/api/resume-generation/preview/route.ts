import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enqueueGenerationJob } from "../jobs/service";
import { generationErrorResponse } from "../errors";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body: unknown = await request.json();
    const job = await enqueueGenerationJob(session.user.id, {
      kind: "profile",
      intent: "preview",
      request: body,
    });
    return NextResponse.json(job, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return generationErrorResponse(error);
  }
}
