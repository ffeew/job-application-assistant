import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ConversationStartersService } from "../service";
import { generateConversationStarterSchema } from "../validators";
import { ProfileService } from "@/app/api/profile/service";
import { ResumesService } from "@/app/api/resumes/service";

const conversationStartersService = new ConversationStartersService();
const profileService = new ProfileService();
const resumesService = new ResumesService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = generateConversationStarterSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validatedData.error.issues,
        },
        { status: 400 },
      );
    }

    const userProfile = await profileService.getUserProfile(session.user.id);
    const defaultResume = await resumesService.getDefaultResume(session.user.id);

    const result =
      await conversationStartersService.generateConversationStarter(
        userProfile,
        defaultResume,
        validatedData.data,
      );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating conversation starter:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes("not configured") ? 503 : 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
