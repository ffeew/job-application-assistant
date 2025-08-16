import { NextRequest } from "next/server";
import { ResumesController } from "@/lib/controllers";

const controller = new ResumesController();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.getResumeById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.updateResume(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.deleteResume(request, { params });
}