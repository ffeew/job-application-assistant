import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "../../service";
import { bulkUpdateOrderSchema } from "../../validators";
import { getUserId } from "../../utils";

const profileService = new ProfileService();

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkUpdateOrderSchema.parse(body);

    await profileService.bulkUpdateEducationOrder(userId, validatedData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating education order:", error);
    return NextResponse.json(
      { error: "Failed to update education order" },
      { status: 500 },
    );
  }
}
