import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "./service";
import {
  createUserProfileSchema,
  updateUserProfileSchema,
} from "./validators";
import { getUserId } from "./utils";

const profileService = new ProfileService();

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await profileService.getUserProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch user profile");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = createUserProfileSchema.parse(body);

    const profile = await profileService.createUserProfile(
      userId,
      validatedData,
    );

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create user profile");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = updateUserProfileSchema.parse(body);

    const profile = await profileService.updateUserProfile(
      userId,
      validatedData,
    );

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    return routeErrorResponse(error, "Failed to update user profile");
  }
}
