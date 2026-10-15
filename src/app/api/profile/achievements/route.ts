import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../service";
import { createAchievementSchema, profileQuerySchema } from "../validators";
import { getUserId } from "../utils";

const profileService = new ProfileService();

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = profileQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    const achievements = await profileService.getAchievements(userId, query);
    return NextResponse.json(achievements);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch achievements");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = createAchievementSchema.parse(body);

    const achievement = await profileService.createAchievement(
      userId,
      validatedData,
    );

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create achievement");
  }
}
