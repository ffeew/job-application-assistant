import { NextRequest } from "next/server";
import { ApplicationsController } from "@/lib/controllers";

const controller = new ApplicationsController();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.getApplicationById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.updateApplication(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.deleteApplication(request, { params });
}