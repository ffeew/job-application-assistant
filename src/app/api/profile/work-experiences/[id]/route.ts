import { NextRequest } from "next/server";
import { ProfileController } from "@/lib/controllers/profile.controller";

const controller = new ProfileController();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return controller.getWorkExperience(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return controller.updateWorkExperience(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return controller.deleteWorkExperience(request, { params });
}