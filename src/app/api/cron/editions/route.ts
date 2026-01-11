import { NextRequest, NextResponse } from "next/server";
import { createDailyEditions } from "@/lib/editionService";

/**
 * CRON endpoint for creating daily editions
 * Should be called once daily (e.g., at midnight)
 *
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/editions",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 *
 * Or use external cron service to call this endpoint with CRON_SECRET header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if CRON_SECRET is set and matches, or if running locally
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const created = await createDailyEditions();

    return NextResponse.json({
      success: true,
      created,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error creating editions:", error);
    return NextResponse.json(
      { error: "Failed to create editions" },
      { status: 500 }
    );
  }
}

// POST method for manual trigger (requires auth)
export async function POST(request: NextRequest) {
  return GET(request);
}
