import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all catalog sources
    const catalogSources = await prisma.catalogSource.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Get user's subscriptions
    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId: session.userId },
      select: { catalogSourceId: true },
    });
    const subscribedIds = new Set(subscriptions.map((s) => s.catalogSourceId));

    // Get hidden sources
    const hidden = await prisma.hiddenCatalogSource.findMany({
      where: { userId: session.userId },
      select: { catalogSourceId: true },
    });
    const hiddenIds = new Set(hidden.map((h) => h.catalogSourceId));

    const sources = catalogSources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      description: source.description,
      category: source.category,
      logoUrl: source.logoUrl,
      articleCount: source.articleCount,
      isSubscribed: subscribedIds.has(source.id),
      isHidden: hiddenIds.has(source.id),
    }));

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Get catalog sources error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
