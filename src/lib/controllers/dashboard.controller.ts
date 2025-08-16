import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardService } from "@/lib/services";
import { activityQuerySchema } from "@/lib/validators";

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  async getDashboardStats() {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const stats = await this.dashboardService.getDashboardStats(session.user.id);
      return NextResponse.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async getDashboardActivity(request: NextRequest) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      // Validate query parameters
      const validatedQuery = activityQuerySchema.safeParse(queryParams);
      if (!validatedQuery.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: validatedQuery.error.issues },
          { status: 400 }
        );
      }

      const activity = await this.dashboardService.getDashboardActivity(
        session.user.id,
        validatedQuery.data
      );

      return NextResponse.json(activity);
    } catch (error) {
      console.error("Error fetching dashboard activity:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}