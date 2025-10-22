import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DashboardService } from "../service";
import { activityQuerySchema } from "../validators";

const dashboardService = new DashboardService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = activityQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validatedQuery.error.issues,
        },
        { status: 400 },
      );
    }

    const activity = await dashboardService.getDashboardActivity(
      session.user.id,
      validatedQuery.data,
    );

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
