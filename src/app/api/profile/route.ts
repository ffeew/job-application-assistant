import { NextRequest } from "next/server";
import { ProfileController } from "@/lib/controllers/profile.controller";

const controller = new ProfileController();

export async function GET(request: NextRequest) {
  return controller.getUserProfile(request);
}

export async function POST(request: NextRequest) {
  return controller.createUserProfile(request);
}

export async function PUT(request: NextRequest) {
  return controller.updateUserProfile(request);
}