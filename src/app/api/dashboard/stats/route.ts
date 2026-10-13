import { headers } from "next/headers";
import { routeErrorResponse } from "@/app/api/route-error";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DashboardService } from "../service";

const dashboardService = new DashboardService();

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await dashboardService.getDashboardStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    return routeErrorResponse(error, "Internal server error");
  }
}
