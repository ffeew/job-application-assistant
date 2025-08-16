import { NextRequest } from "next/server";
import { ApplicationsController } from "@/lib/controllers";

const controller = new ApplicationsController();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.getApplicationById(request, { params: resolvedParams });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.updateApplication(request, { params: resolvedParams });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.deleteApplication(request, { params: resolvedParams });
}