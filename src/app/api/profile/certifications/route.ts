import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../service";
import {
  createCertificationSchema,
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

    const certifications = await profileService.getCertifications(
      userId,
      query,
    );

    return NextResponse.json(certifications);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch certifications");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = createCertificationSchema.parse(body);

    const certification = await profileService.createCertification(
      userId,
      validatedData,
    );

    return NextResponse.json(certification, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create certification");
  }
}
