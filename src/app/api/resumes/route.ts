import { NextRequest } from "next/server";
import { ResumesController } from "@/lib/controllers";

const controller = new ResumesController();

export async function GET(request: NextRequest) {
  return controller.getResumes(request);
}

export async function POST(request: NextRequest) {
  return controller.createResume(request);
}