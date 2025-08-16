import { NextRequest } from "next/server";
import { CoverLettersController } from "@/lib/controllers";

const controller = new CoverLettersController();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.getCoverLetterById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.updateCoverLetter(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return controller.deleteCoverLetter(request, { params });
}