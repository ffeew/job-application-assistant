import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../../service";
import { updateSkillSchema } from "../../validators";
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
    const skillId = parseNumericId(id);
    if (skillId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const skill = await profileService.getSkill(userId, skillId);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json(skill);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch skill");
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
    const skillId = parseNumericId(id);
    if (skillId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const validatedData = updateSkillSchema.parse(body);

    const skill = await profileService.updateSkill(
      userId,
      skillId,
      validatedData,
    );

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json(skill);
  } catch (error) {
    return routeErrorResponse(error, "Failed to update skill");
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
    const skillId = parseNumericId(id);
    if (skillId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await profileService.deleteSkill(userId, skillId);
    if (!deleted) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to delete skill");
  }
}
