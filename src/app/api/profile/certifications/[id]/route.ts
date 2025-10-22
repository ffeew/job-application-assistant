import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "../../service";
import { updateCertificationSchema } from "../../validators";
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
    const certificationId = parseNumericId(id);
    if (certificationId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const certification = await profileService.getCertification(
      userId,
      certificationId,
    );

    if (!certification) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(certification);
  } catch (error) {
    console.error("Error fetching certification:", error);
    return NextResponse.json(
      { error: "Failed to fetch certification" },
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
    const certificationId = parseNumericId(id);
    if (certificationId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateCertificationSchema.parse(body);

    const certification = await profileService.updateCertification(
      userId,
      certificationId,
      validatedData,
    );

    if (!certification) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(certification);
  } catch (error) {
    console.error("Error updating certification:", error);
    return NextResponse.json(
      { error: "Failed to update certification" },
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
    const certificationId = parseNumericId(id);
    if (certificationId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await profileService.deleteCertification(
      userId,
      certificationId,
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting certification:", error);
    return NextResponse.json(
      { error: "Failed to delete certification" },
      { status: 500 },
    );
  }
}
