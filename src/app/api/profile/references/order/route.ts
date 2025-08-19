import { NextRequest } from "next/server";
import { ProfileController } from "@/lib/controllers/profile.controller";

const controller = new ProfileController();

export async function PUT(request: NextRequest) {
  return controller.bulkUpdateReferencesOrder(request);
}