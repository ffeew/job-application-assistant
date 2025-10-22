import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "../../service";
import { updateReferenceSchema } from "../../validators";
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
    const referenceId = parseNumericId(id);
    if (referenceId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const reference = await profileService.getReference(userId, referenceId);
    if (!reference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(reference);
  } catch (error) {
    console.error("Error fetching reference:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference" },
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
    const referenceId = parseNumericId(id);
    if (referenceId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateReferenceSchema.parse(body);

    const reference = await profileService.updateReference(
      userId,
      referenceId,
      validatedData,
    );

    if (!reference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(reference);
  } catch (error) {
    console.error("Error updating reference:", error);
    return NextResponse.json(
      { error: "Failed to update reference" },
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
    const referenceId = parseNumericId(id);
    if (referenceId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await profileService.deleteReference(userId, referenceId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reference:", error);
    return NextResponse.json(
      { error: "Failed to delete reference" },
      { status: 500 },
    );
  }
}
