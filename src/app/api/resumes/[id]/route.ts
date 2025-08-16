import { NextRequest } from "next/server";
import { ResumesController } from "@/lib/controllers";

const controller = new ResumesController();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.getResumeById(request, { params: resolvedParams });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.updateResume(request, { params: resolvedParams });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.deleteResume(request, { params: resolvedParams });
}