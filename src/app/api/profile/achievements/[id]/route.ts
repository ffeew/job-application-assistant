import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../../service";
import { updateAchievementSchema } from "../../validators";
import { getUserId, parseNumericId } from "../../utils";

const profileService = new ProfileService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const achievementId = parseNumericId(id);
    if (achievementId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const achievement = await profileService.getAchievement(userId, achievementId);
    if (!achievement) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(achievement);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch achievement");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const achievementId = parseNumericId(id);
    if (achievementId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const validatedData = updateAchievementSchema.parse(body);

    const achievement = await profileService.updateAchievement(
      userId,
      achievementId,
      validatedData,
    );

    if (!achievement) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(achievement);
  } catch (error) {
    return routeErrorResponse(error, "Failed to update achievement");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const achievementId = parseNumericId(id);
    if (achievementId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await profileService.deleteAchievement(userId, achievementId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to delete achievement");
  }
}
