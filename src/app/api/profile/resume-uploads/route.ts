import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { fileStorageAvailable } from "@/app/api/stored-files";
import { getUserId } from "../utils";
import { listUploads } from "./service";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      available: fileStorageAvailable,
      files: await listUploads(userId),
    });
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch imported files");
  }
}
