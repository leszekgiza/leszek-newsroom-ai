import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  scrapeArticlesList,
  scrapeUrl,
  checkScraperHealth,
  SourceConfig,
} from "@/lib/scrapeService";
import { generatePolishIntro } from "@/lib/aiService";
import { getConnector } from "@/lib/connectors/factory";

// Source types that use the connector pipeline (not the scraper)
const CONNECTOR_TYPES = new Set(["GMAIL", "LINKEDIN", "TWITTER"]);

interface ScrapeResult {
  sourceId: string;
  sourceName: string;
  articlesFound: number;
  articlesNew: number;
  articlesFailed: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      console.log("[SCRAPE] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId, sourceType } = await request.json();
    console.log(`[SCRAPE] Starting scrape for sourceId=${sourceId}, type=${sourceType}`);

    if (!sourceId) {
      return NextResponse.json(
        { error: "ID źródła jest wymagane" },
        { status: 400 }
      );
    }

    // Get source based on type
    let source;
    let isPrivate = sourceType === "private";

    if (isPrivate) {
      source = await prisma.privateSource.findFirst({
        where: {
          id: sourceId,
          userId: session.userId,
        },
      });
    } else {
      source = await prisma.catalogSource.findUnique({
        where: { id: sourceId },
      });
    }

    console.log(`[SCRAPE] Source found: ${source?.name} (${source?.url})`);

    if (!source) {
      console.log(`[SCRAPE] Source not found: ${sourceId}`);
      return NextResponse.json(
        { error: "Źródło nie znalezione" },
        { status: 404 }
      );
    }

    if (!source.isActive) {
      console.log(`[SCRAPE] Source is inactive: ${source.name}`);
      return NextResponse.json(
        { error: "Źródło jest wyłączone" },
        { status: 400 }
      );
    }

    // For connector-type sources (GMAIL, LINKEDIN, TWITTER), use the connector pipeline
    // (no scraper health check needed — connectors use their own API)
    if (isPrivate && "type" in source && CONNECTOR_TYPES.has(source.type as string)) {
      console.log(`[SCRAPE] Routing to connector pipeline for type=${source.type}`);
      return await handleConnectorSync(source as { id: string; type: string; status: string; credentials: string | null; config: Prisma.JsonValue; name: string });
    }

    // Check scraper health (only for scraper-type sources)
    const scraperHealthy = await checkScraperHealth();
    console.log(`[SCRAPE] Scraper health: ${scraperHealthy}`);
    if (!scraperHealthy) {
      return NextResponse.json(
        { error: "Serwis scrapowania jest niedostępny" },
        { status: 503 }
      );
    }

    // Get source config for pattern filtering (private sources only)
    // PrivateSource has 'config' field, CatalogSource does not
    const sourceConfig: SourceConfig | null = isPrivate && "config" in source && source.config
      ? (source.config as SourceConfig)
      : null;

    // Scrape articles list from source with pattern filtering
    console.log(`[SCRAPE] Fetching articles from: ${source.url}`);
    if (sourceConfig?.includePatterns?.length) {
      console.log(`[SCRAPE] Using patterns: ${sourceConfig.includePatterns.join(", ")}`);
    }
    const articlesResult = await scrapeArticlesList(source.url, 20, sourceConfig);
    console.log(`[SCRAPE] Scraper response: success=${articlesResult.success}, articles=${articlesResult.articles?.length || 0}`);

    if (!articlesResult.success) {
      return NextResponse.json(
        { error: `Błąd scrapowania: ${articlesResult.error}` },
        { status: 500 }
      );
    }

    const result: ScrapeResult = {
      sourceId,
      sourceName: source.name,
      articlesFound: articlesResult.articles.length,
      articlesNew: 0,
      articlesFailed: 0,
      errors: [],
    };

    // Process each article
    console.log(`[SCRAPE] Processing ${articlesResult.articles.length} articles...`);
    for (const articleInfo of articlesResult.articles) {
      try {
        console.log(`[SCRAPE] Checking: ${articleInfo.url.slice(0, 80)}...`);

        // Check if article already exists
        const existing = await prisma.article.findUnique({
          where: { url: articleInfo.url },
        });

        if (existing) {
          console.log(`[SCRAPE] SKIP (exists): ${articleInfo.title?.slice(0, 40)}`);
          continue; // Skip existing articles
        }

        // Scrape article content
        console.log(`[SCRAPE] Fetching content for: ${articleInfo.title?.slice(0, 40)}`);
        const articleContent = await scrapeUrl(articleInfo.url);

        if (!articleContent.success) {
          console.log(`[SCRAPE] FAILED to fetch: ${articleContent.error}`);
          result.articlesFailed++;
          result.errors.push(`${articleInfo.title}: ${articleContent.error}`);
          continue;
        }

        // Generate Polish intro using AI
        const intro = await generatePolishIntro(
          articleContent.title || articleInfo.title,
          articleContent.markdown || ""
        );
        console.log(`[SCRAPE] Polish intro generated: ${intro?.slice(0, 50) || 'none'}...`);

        // Create article in database
        const articleData: {
          url: string;
          title: string;
          intro: string | null;
          summary: null;
          imageUrl: null;
          author: string | null;
          publishedAt: Date | null;
          catalogSourceId?: string;
          privateSourceId?: string;
        } = {
          url: articleInfo.url,
          title: articleContent.title || articleInfo.title,
          intro: intro || null,
          summary: null, // Will be generated on-demand via Claude
          imageUrl: null,
          author: articleInfo.author || null,
          publishedAt: articleInfo.date ? new Date(articleInfo.date) : null,
        };

        // Set source reference based on type
        if (isPrivate) {
          articleData.privateSourceId = sourceId;
        } else {
          articleData.catalogSourceId = sourceId;
        }

        console.log(`[SCRAPE] SAVING: ${articleData.title?.slice(0, 40)} (date: ${articleData.publishedAt})`);
        await prisma.article.create({ data: articleData });
        result.articlesNew++;
        console.log(`[SCRAPE] SAVED OK: ${articleData.title?.slice(0, 40)}`);
      } catch (error) {
        console.log(`[SCRAPE] ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);
        result.articlesFailed++;
        result.errors.push(
          `${articleInfo.title}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Update source lastScrapedAt
    if (isPrivate) {
      await prisma.privateSource.update({
        where: { id: sourceId },
        data: { lastScrapedAt: new Date() },
      });
    } else {
      await prisma.catalogSource.update({
        where: { id: sourceId },
        data: {
          lastScrapedAt: new Date(),
          articleCount: {
            increment: result.articlesNew,
          },
        },
      });
    }

    console.log(`[SCRAPE] DONE: ${result.articlesNew} new, ${result.articlesFailed} failed, ${result.articlesFound} total`);
    if (result.errors.length > 0) {
      console.log(`[SCRAPE] Errors: ${result.errors.join('; ')}`);
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Pobrano ${result.articlesNew} nowych artykułów z ${result.articlesFound} znalezionych`,
    });
  } catch (error) {
    console.error("[SCRAPE] CRITICAL ERROR:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas scrapowania" },
      { status: 500 }
    );
  }
}

/**
 * Handle sync for connector-type sources (GMAIL, LINKEDIN, TWITTER).
 * Uses the connector pipeline instead of Crawl4AI scraper.
 */
async function handleConnectorSync(source: {
  id: string;
  type: string;
  status: string;
  credentials: string | null;
  config: Prisma.JsonValue;
  name: string;
}) {
  if (source.status === "DISCONNECTED" || !source.credentials) {
    return NextResponse.json(
      { error: "Konektor nie jest połączony. Przejdź do Integracji aby go skonfigurować." },
      { status: 400 }
    );
  }

  if (source.status === "SYNCING") {
    return NextResponse.json(
      { error: "Synchronizacja już trwa" },
      { status: 409 }
    );
  }

  // Mark as syncing
  await prisma.privateSource.update({
    where: { id: source.id },
    data: { status: "SYNCING" },
  });

  try {
    const connector = await getConnector(source.type as "GMAIL" | "LINKEDIN" | "TWITTER");

    // Fetch full source from DB for connector (needs all fields)
    const fullSource = await prisma.privateSource.findUnique({
      where: { id: source.id },
    });

    if (!fullSource) {
      throw new Error("Source not found");
    }

    const items = await connector.fetchItems(fullSource);
    console.log(`[CONNECTOR] Fetched ${items.length} items from ${source.type}`);

    let newCount = 0;
    for (const item of items) {
      const existing = await prisma.article.findUnique({
        where: { url: item.url },
      });
      if (!existing) {
        await prisma.article.create({
          data: {
            url: item.url,
            title: item.title,
            intro: null,
            summary: null,
            author: item.author,
            publishedAt: item.publishedAt,
            privateSourceId: source.id,
          },
        });
        newCount++;
      }
    }

    // Update sync metadata
    const config = (fullSource.config as Record<string, unknown>) || {};
    const lastId = items.length > 0 ? items[0].externalId : config.lastSyncMessageId;

    await prisma.privateSource.update({
      where: { id: source.id },
      data: {
        status: "CONNECTED",
        lastScrapedAt: new Date(),
        lastSyncError: null,
        config: {
          ...config,
          lastSyncMessageId: lastId,
        } as Prisma.InputJsonValue,
      },
    });

    console.log(`[CONNECTOR] DONE: ${newCount} new articles from ${items.length} fetched`);

    return NextResponse.json({
      success: true,
      result: {
        sourceId: source.id,
        sourceName: source.name,
        articlesFound: items.length,
        articlesNew: newCount,
        articlesFailed: 0,
        errors: [],
      },
      message: `Pobrano ${newCount} nowych artykułów z ${items.length} znalezionych`,
    });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Sync failed";
    console.error(`[CONNECTOR] ERROR: ${message}`);

    await prisma.privateSource.update({
      where: { id: source.id },
      data: {
        status: "ERROR",
        lastSyncError: message,
      },
    });

    return NextResponse.json(
      { error: `Błąd synchronizacji: ${message}` },
      { status: 500 }
    );
  }
}
