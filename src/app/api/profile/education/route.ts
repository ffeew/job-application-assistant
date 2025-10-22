import { NextRequest, NextResponse } from "next/server";
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
    console.error("Error fetching education:", error);
    return NextResponse.json(
      { error: "Failed to fetch education" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createEducationSchema.parse(body);

    const education = await profileService.createEducation(
      userId,
      validatedData,
    );

    return NextResponse.json(education, { status: 201 });
  } catch (error) {
    console.error("Error creating education:", error);
    return NextResponse.json(
      { error: "Failed to create education" },
      { status: 500 },
    );
  }
}
