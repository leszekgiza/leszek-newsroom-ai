import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.privateSource.findMany({
      where: {
        userId: session.userId,
        type: { in: ["GMAIL", "LINKEDIN", "TWITTER"] },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastScrapedAt: true,
        lastSyncError: true,
        syncInterval: true,
        config: true,
        _count: { select: { articles: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const connectors = sources.map((s) => {
      const config = (s.config as Record<string, unknown>) || {};
      const senders = Array.isArray(config.senders) ? config.senders : [];

      return {
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        lastSyncAt: s.lastScrapedAt,
        lastSyncError: s.lastSyncError,
        syncInterval: s.syncInterval,
        articleCount: s._count.articles,
        senderCount: senders.length,
      };
    });

    // Summary stats
    const active = connectors.filter(
      (c) => c.status === "CONNECTED" || c.status === "SYNCING"
    ).length;
    const needsAttention = connectors.filter(
      (c) => c.status === "EXPIRED" || c.status === "ERROR"
    ).length;
    const totalArticles = connectors.reduce(
      (sum, c) => sum + c.articleCount,
      0
    );

    return NextResponse.json({
      connectors,
      summary: { active, needsAttention, totalArticles },
    });
  } catch (error) {
    console.error("List connectors error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
