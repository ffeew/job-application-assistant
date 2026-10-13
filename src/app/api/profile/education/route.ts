import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../service";
import {
  createEducationSchema,
  profileQuerySchema,
} from "../validators";
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

    const education = await profileService.getEducation(userId, query);
    return NextResponse.json(education);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch education");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = createEducationSchema.parse(body);

    const education = await profileService.createEducation(
      userId,
      validatedData,
    );

    return NextResponse.json(education, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create education");
  }
}
