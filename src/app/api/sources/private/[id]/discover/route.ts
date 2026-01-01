import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkScraperHealth } from "@/lib/scrapeService";

const SCRAPER_URL = process.env.SCRAPER_URL || "http://localhost:8000";

interface DiscoveredLink {
  url: string;
  title: string;
  path: string;
}

/**
 * POST /api/sources/private/[id]/discover
 * Fetch all links from a source URL for the onboarding wizard
 */
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

    // Get source
    const source = await prisma.privateSource.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Źródło nie znalezione" },
        { status: 404 }
      );
    }

    // Check scraper health
    const scraperHealthy = await checkScraperHealth();
    if (!scraperHealthy) {
      return NextResponse.json(
        { error: "Serwis scrapowania jest niedostępny" },
        { status: 503 }
      );
    }

    // Fetch all links from the source URL using scraper
    // We use a higher limit to get more links for discovery
    const response = await fetch(`${SCRAPER_URL}/scrape/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: source.url,
        max_articles: 100, // Get more links for discovery
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Błąd podczas pobierania linków ze strony" },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Nie udało się pobrać linków" },
        { status: 500 }
      );
    }

    // Transform articles to discovered links format
    const links: DiscoveredLink[] = result.articles.map(
      (article: { url: string; title: string }) => {
        let path = "";
        try {
          path = new URL(article.url).pathname;
        } catch {
          path = article.url;
        }
        return {
          url: article.url,
          title: article.title || path,
          path,
        };
      }
    );

    return NextResponse.json({
      success: true,
      sourceUrl: source.url,
      links,
      totalCount: links.length,
    });
  } catch (error) {
    console.error("[DISCOVER] Error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas odkrywania linków" },
      { status: 500 }
    );
  }
}
