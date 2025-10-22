import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "../../service";
import { updateEducationSchema } from "../../validators";
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
    const educationId = parseNumericId(id);
    if (educationId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const education = await profileService.getEducationById(
      userId,
      educationId,
    );

    if (!education) {
      return NextResponse.json(
        { error: "Education not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(education);
  } catch (error) {
    console.error("Error fetching education:", error);
    return NextResponse.json(
      { error: "Failed to fetch education" },
      { status: 500 },
    );
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
    const educationId = parseNumericId(id);
    if (educationId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateEducationSchema.parse(body);

    const education = await profileService.updateEducation(
      userId,
      educationId,
      validatedData,
    );

    if (!education) {
      return NextResponse.json(
        { error: "Education not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(education);
  } catch (error) {
    console.error("Error updating education:", error);
    return NextResponse.json(
      { error: "Failed to update education" },
      { status: 500 },
    );
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
    const educationId = parseNumericId(id);
    if (educationId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await profileService.deleteEducation(userId, educationId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Education not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting education:", error);
    return NextResponse.json(
      { error: "Failed to delete education" },
      { status: 500 },
    );
  }
}
