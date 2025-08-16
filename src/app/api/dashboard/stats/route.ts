import { DashboardController } from "@/lib/controllers";

const controller = new DashboardController();

export async function GET() {
  return controller.getDashboardStats();
}