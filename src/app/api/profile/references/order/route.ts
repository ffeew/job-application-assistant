import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
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

    const body: unknown = await request.json();
    const validatedData = bulkUpdateOrderSchema.parse(body);

    await profileService.bulkUpdateReferencesOrder(userId, validatedData);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to update references order");
  }
}
