import { NextRequest } from "next/server";
import { DashboardController } from "@/lib/controllers";

const controller = new DashboardController();

export async function GET(request: NextRequest) {
  return controller.getDashboardActivity(request);
}