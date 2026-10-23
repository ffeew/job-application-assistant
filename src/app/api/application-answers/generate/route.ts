import { NextRequest, NextResponse } from "next/server";
import { limitAiRequest } from "@/app/api/ai-rate-limit";
import { routeErrorResponse } from "@/app/api/route-error";
import { auth } from "@/lib/auth";
import { ApplicationAnswersService } from "../service";
import { draftAnswersRequestSchema } from "../validators";

const applicationAnswersService = new ApplicationAnswersService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = limitAiRequest("applicationAnswers", session.user.id);
    if (limited) return limited;

    const body: unknown = await request.json();
    const validatedData = draftAnswersRequestSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await applicationAnswersService.draft(
        session.user.id,
        validatedData.data,
      ),
    );
  } catch (error) {
    return routeErrorResponse(error, "Failed to draft the answers");
  }
}
