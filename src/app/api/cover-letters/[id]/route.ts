import { NextRequest } from "next/server";
import { CoverLettersController } from "@/lib/controllers";

const controller = new CoverLettersController();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.getCoverLetterById(request, { params: resolvedParams });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.updateCoverLetter(request, { params: resolvedParams });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return controller.deleteCoverLetter(request, { params: resolvedParams });
}