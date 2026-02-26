import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEditionWithArticles, generateEditionSummary } from "@/lib/editionService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const edition = await getEditionWithArticles(id, session.userId);

    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: edition.id,
      date: edition.date.toISOString(),
      title: edition.title,
      summary: edition.summary,
      articleCount: edition.articleCount,
      unreadCount: edition.unreadCount,
      articles: edition.articles.map((a) => ({
        id: a.id,
        title: a.title,
        intro: a.intro,
        summary: a.summary,
        url: a.url,
        imageUrl: a.imageUrl,
        publishedAt: a.publishedAt?.toISOString() || null,
        source: a.catalogSource?.name || a.privateSource?.name || "Unknown",
        sourceLogoUrl: a.catalogSource?.logoUrl || null,
        isRead: a.isRead,
        isSaved: a.isSaved,
      })),
    });
  } catch (error) {
    console.error("[API] Error fetching edition:", error);
    return NextResponse.json(
      { error: "Failed to fetch edition" },
      { status: 500 }
    );
  }
}

// POST - regenerate edition summary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const summary = await generateEditionSummary(id);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[API] Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
