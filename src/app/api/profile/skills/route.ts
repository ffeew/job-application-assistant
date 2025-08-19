import { NextRequest } from "next/server";
import { ProfileController } from "@/lib/controllers/profile.controller";

const controller = new ProfileController();

export async function GET(request: NextRequest) {
  return controller.getSkills(request);
}

export async function POST(request: NextRequest) {
  return controller.createSkill(request);
}