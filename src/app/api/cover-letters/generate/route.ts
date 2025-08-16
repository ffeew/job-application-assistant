import { NextRequest } from "next/server";
import { CoverLettersController } from "@/lib/controllers";

const controller = new CoverLettersController();

export async function POST(request: NextRequest) {
  return controller.generateCoverLetter(request);
}