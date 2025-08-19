import { NextRequest } from "next/server";
import { ProfileController } from "@/lib/controllers/profile.controller";

const controller = new ProfileController();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return controller.getReference(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return controller.updateReference(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return controller.deleteReference(request, { params });
}