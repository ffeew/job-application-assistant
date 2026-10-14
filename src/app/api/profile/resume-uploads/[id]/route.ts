import { NextRequest, NextResponse } from "next/server";
import { routeErrorResponse } from "@/app/api/route-error";
import { readFile } from "@/app/api/stored-files";
import { getUserId } from "../../utils";
import { deleteUpload, getUpload } from "../service";

// The name is the user's own, so it is quoted for the header: an ASCII
// fallback, and the exact name in the RFC 5987 form browsers prefer.
function attachment(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const exact = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${exact}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const upload = await getUpload(userId, id);
    if (!upload) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stored = await readFile(upload.storageKey);
    if (stored.state === "unavailable") {
      return NextResponse.json(
        { error: "File storage is unavailable. Try again in a moment." },
        { status: 503 },
      );
    }
    if (stored.state === "missing") {
      return NextResponse.json(
        {
          error:
            "This file is no longer in storage. Delete it from the list and import it again.",
        },
        { status: 404 },
      );
    }

    // Always a download, never rendered: the content is whatever was uploaded
    // and must not run or display under this site's origin.
    return new Response(stored.bytes, {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Disposition": attachment(upload.fileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return routeErrorResponse(error, "Failed to fetch imported file");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!(await deleteUpload(userId, id))) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error, "Failed to delete imported file");
  }
}
