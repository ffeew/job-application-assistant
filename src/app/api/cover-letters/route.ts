import { NextRequest } from "next/server";
import { CoverLettersController } from "@/lib/controllers";

const controller = new CoverLettersController();

export async function GET(request: NextRequest) {
  return controller.getCoverLetters(request);
}

export async function POST(request: NextRequest) {
  return controller.createCoverLetter(request);
}