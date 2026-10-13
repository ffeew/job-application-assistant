import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../../service";
import { updateWorkExperienceSchema } from "../../validators";
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
    const experienceId = parseNumericId(id);
    if (experienceId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const experience = await profileService.getWorkExperience(
      userId,
      experienceId,
    );

    if (!experience) {
      return NextResponse.json(
        { error: "Work experience not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(experience);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch work experience");
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
    const experienceId = parseNumericId(id);
    if (experienceId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const validatedData = updateWorkExperienceSchema.parse(body);

    const experience = await profileService.updateWorkExperience(
      userId,
      experienceId,
      validatedData,
    );

    if (!experience) {
      return NextResponse.json(
        { error: "Work experience not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(experience);
  } catch (error) {
    return routeErrorResponse(error, "Failed to update work experience");
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
    const experienceId = parseNumericId(id);
    if (experienceId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await profileService.deleteWorkExperience(
      userId,
      experienceId,
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Work experience not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to delete work experience");
  }
}
