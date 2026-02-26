import { NextRequest, NextResponse } from "next/server";
import { generateAllBriefings } from "@/lib/briefingService";

/**
 * CRON endpoint for generating morning briefings
 * Should be called ~2h before earliest user's briefingTime
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await generateAllBriefings();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error generating briefings:", error);
    return NextResponse.json(
      { error: "Failed to generate briefings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
