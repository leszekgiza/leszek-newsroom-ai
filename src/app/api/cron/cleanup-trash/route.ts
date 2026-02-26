import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredTrash } from "@/lib/trashService";

/**
 * CRON endpoint for cleaning up expired trash
 * Runs daily at 01:00 UTC
 * - Private articles dismissed >15 days ago are deleted from DB
 * - Catalog articles keep DismissedArticle record (permanently hidden)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await cleanupExpiredTrash();

    return NextResponse.json({
      success: true,
      deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error cleaning up trash:", error);
    return NextResponse.json(
      { error: "Failed to clean up trash" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
