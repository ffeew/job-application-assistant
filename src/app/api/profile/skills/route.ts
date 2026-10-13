import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { ProfileService } from "../service";
import {
  createSkillSchema,
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

    const skills = await profileService.getSkills(userId, query);
    return NextResponse.json(skills);
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch skills");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validatedData = createSkillSchema.parse(body);

    const skill = await profileService.createSkill(userId, validatedData);
    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create skill");
  }
}
