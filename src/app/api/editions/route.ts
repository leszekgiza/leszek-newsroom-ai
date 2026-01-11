import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserEditions, createDailyEditions } from "@/lib/editionService";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "30");

    const editions = await getUserEditions(session.userId, limit);

    return NextResponse.json({
      editions: editions.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        title: e.title,
        summary: e.summary,
        articleCount: e.articleCount,
        unreadCount: e.unreadCount,
      })),
    });
  } catch (error) {
    console.error("[API] Error fetching editions:", error);
    return NextResponse.json(
      { error: "Failed to fetch editions" },
      { status: 500 }
    );
  }
}

// POST - trigger edition creation (for cron job or manual trigger)
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for cron secret or admin role in future
    const created = await createDailyEditions();

    return NextResponse.json({
      success: true,
      created,
    });
  } catch (error) {
    console.error("[API] Error creating editions:", error);
    return NextResponse.json(
      { error: "Failed to create editions" },
      { status: 500 }
    );
  }
}
