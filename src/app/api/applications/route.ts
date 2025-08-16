import { NextRequest } from "next/server";
import { ApplicationsController } from "@/lib/controllers";

const controller = new ApplicationsController();

export async function GET(request: NextRequest) {
  return controller.getApplications(request);
}

export async function POST(request: NextRequest) {
  return controller.createApplication(request);
}