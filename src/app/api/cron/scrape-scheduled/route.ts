import { NextRequest, NextResponse } from "next/server";
import { isPremiumEnabled } from "@/lib/featureFlags";

/**
 * CRON endpoint for running scheduled source sync (Premium feature).
 * Scrapes sources for users who have scheduled sync enabled and are due.
 *
 * Should be called periodically (e.g., every 15 minutes).
 *
 * Requires CRON_SECRET for authorization (if set).
 */
export async function GET(request: NextRequest) {
  try {
    // Premium gate
    if (!isPremiumEnabled()) {
      return NextResponse.json(
        { error: "Premium feature not enabled" },
        { status: 404 }
      );
    }

    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dynamic import to avoid ESLint no-restricted-imports for premium code
    const { runScheduledSync } = await import(
      "@/premium/lib/scheduledSyncService"
    );
    const result = await runScheduledSync();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SCHED] CRITICAL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to run scheduled sync" },
      { status: 500 }
    );
  }
}

// POST method for manual trigger (requires auth)
export async function POST(request: NextRequest) {
  return GET(request);
}
