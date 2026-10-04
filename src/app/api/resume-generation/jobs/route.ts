import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enqueueGenerationJob, getLatestGenerationJob } from "./service";
import { generationErrorResponse } from "../errors";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body: unknown = await request.json();
    return NextResponse.json(
      await enqueueGenerationJob(session.user.id, body),
      {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return generationErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const applicationId = request.nextUrl.searchParams.get("applicationId");
    return NextResponse.json(
      await getLatestGenerationJob(session.user.id, applicationId),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return generationErrorResponse(error);
  }
}
