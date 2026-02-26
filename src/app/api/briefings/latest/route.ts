import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLatestBriefing } from "@/lib/briefingService";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const briefing = await getLatestBriefing(user.userId);

    if (!briefing) {
      return NextResponse.json({ briefing: null });
    }

    return NextResponse.json({
      briefing: {
        id: briefing.id,
        date: briefing.date,
        status: briefing.status,
        introScript: briefing.introScript,
        articleIds: briefing.articleIds,
        top3Ids: briefing.top3Ids,
        edition: briefing.edition,
      },
    });
  } catch (error) {
    console.error("[Briefing] Error fetching latest:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefing" },
      { status: 500 }
    );
  }
}
