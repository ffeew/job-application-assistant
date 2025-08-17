import { NextRequest } from "next/server";
import { ResumeGenerationController } from "@/lib/controllers/resume-generation.controller";

const controller = new ResumeGenerationController();

export async function POST(request: NextRequest) {
  return controller.generateResumePreview(request);
}