import { NextRequest } from "next/server";
import { ResumeGenerationController } from "@/lib/controllers/resume-generation.controller";

const controller = new ResumeGenerationController();

export async function GET(request: NextRequest) {
  return controller.getResumeData(request);
}

export async function POST(request: NextRequest) {
  return controller.validateResumeGeneration(request);
}