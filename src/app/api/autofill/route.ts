import { NextRequest, NextResponse } from "next/server";
import { limitAiRequest } from "@/app/api/ai-rate-limit";
import { routeErrorResponse } from "@/app/api/route-error";
import { auth } from "@/lib/auth";
import { AutofillService } from "./service";
import { autofillRequestSchema } from "./validators";

const autofillService = new AutofillService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = limitAiRequest("autofill", session.user.id);
    if (limited) return limited;

    const body: unknown = await request.json();
    const validatedData = autofillRequestSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await autofillService.plan(
        session.user.id,
        validatedData.data,
        request.signal,
      ),
    );
  } catch (error) {
    return routeErrorResponse(error, "Failed to plan the form fill");
  }
}
