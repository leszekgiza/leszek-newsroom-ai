import { NextResponse } from "next/server";
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
import { addArticleToEdition } from "@/lib/editionService";
import { getConnector } from "@/lib/connectors/factory";

// Source types that use the connector pipeline (not the scraper)
const CONNECTOR_TYPES = new Set(["GMAIL", "LINKEDIN", "TWITTER"]);

interface ProgressEvent {
  type: "start" | "source_start" | "article_check" | "article_new" | "article_skip" | "article_error" | "source_done" | "done" | "error";
  sourceId?: string;
  sourceName?: string;
  sourceIndex?: number;
  totalSources?: number;
  articleUrl?: string;
  articleTitle?: string;
  articleIndex?: number;
  totalArticles?: number;
  newCount?: number;
  skipCount?: number;
  errorCount?: number;
  message?: string;
  error?: string;
}

function createSSEMessage(event: ProgressEvent): string {
  return "data: " + JSON.stringify(event) + "\n\n";
}

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId: session.userId },
    include: { catalogSource: true },
  });

  const privateSources = await prisma.privateSource.findMany({
    where: { userId: session.userId, isActive: true },
  });

  const sources = [
    ...subscriptions.filter(s => s.catalogSource.isActive).map(s => ({
      id: s.catalogSourceId,
      name: s.catalogSource.name,
      url: s.catalogSource.url,
      isPrivate: false,
      isConnector: false,
      sourceType: "WEBSITE" as string,
      config: null as SourceConfig | null,
    })),
    ...privateSources.map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
      isPrivate: true,
      isConnector: CONNECTOR_TYPES.has(s.type),
      sourceType: s.type as string,
      config: s.config as SourceConfig | null,
    })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(createSSEMessage(event)));
      };

      try {
        // Check if scraper is needed (any non-connector sources?)
        const hasScraperSources = sources.some(s => !s.isConnector);
        let scraperHealthy = true;
        if (hasScraperSources) {
          scraperHealthy = await checkScraperHealth();
        }

        if (!scraperHealthy && !sources.some(s => s.isConnector)) {
          // No connector sources and scraper is down → abort
          send({ type: "error", error: "Serwis scrapowania jest niedostepny" });
          controller.close();
          return;
        }

        send({ type: "start", totalSources: sources.length, message: "Rozpoczynam pobieranie" });

        let totalNew = 0, totalSkip = 0, totalError = 0;

        for (let sourceIdx = 0; sourceIdx < sources.length; sourceIdx++) {
          const source = sources[sourceIdx];
          send({
            type: "source_start",
            sourceId: source.id,
            sourceName: source.name,
            sourceIndex: sourceIdx + 1,
            totalSources: sources.length,
          });

          try {
            // Route connector-type sources through connector pipeline
            if (source.isConnector) {
              const result = await syncConnectorSource(source.id, source.sourceType, source.name, send, session.userId);
              totalNew += result.newCount;
              totalSkip += result.skipCount;
              totalError += result.errorCount;
              continue;
            }

            // Skip scraper sources if scraper is down
            if (!scraperHealthy) {
              send({ type: "source_done", sourceId: source.id, sourceName: source.name, newCount: 0, skipCount: 0, errorCount: 1, error: "Scraper niedostepny" });
              totalError++;
              continue;
            }

            const articlesResult = await scrapeArticlesList(source.url, 20, source.config);

            if (!articlesResult.success) {
              send({ type: "source_done", sourceId: source.id, sourceName: source.name, newCount: 0, skipCount: 0, errorCount: 1, error: articlesResult.error });
              totalError++;
              continue;
            }

            let newCount = 0, skipCount = 0, errorCount = 0;

            for (let artIdx = 0; artIdx < articlesResult.articles.length; artIdx++) {
              const articleInfo = articlesResult.articles[artIdx];

              send({
                type: "article_check",
                sourceId: source.id,
                articleUrl: articleInfo.url,
                articleTitle: articleInfo.title,
                articleIndex: artIdx + 1,
                totalArticles: articlesResult.articles.length,
              });

              try {
                const existing = await prisma.article.findUnique({ where: { url: articleInfo.url } });

                if (existing) {
                  skipCount++;
                  send({ type: "article_skip", sourceId: source.id, articleTitle: articleInfo.title });
                  continue;
                }

                const articleContent = await scrapeUrl(articleInfo.url);
                if (!articleContent.success) {
                  errorCount++;
                  send({ type: "article_error", sourceId: source.id, articleTitle: articleInfo.title, error: articleContent.error });
                  continue;
                }

                const intro = await generatePolishIntro(articleContent.title || articleInfo.title, articleContent.markdown || "");

                const articleData = {
                  url: articleInfo.url,
                  title: articleContent.title || articleInfo.title,
                  intro: intro || null,
                  summary: null,
                  imageUrl: null,
                  author: articleInfo.author || null,
                  publishedAt: articleInfo.date ? new Date(articleInfo.date) : null,
                  ...(source.isPrivate ? { privateSourceId: source.id } : { catalogSourceId: source.id }),
                };

                const createdArticle = await prisma.article.create({ data: articleData });

                // Add to today's edition
                await addArticleToEdition(createdArticle.id, session.userId);
                newCount++;
                send({ type: "article_new", sourceId: source.id, articleTitle: articleData.title });
              } catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                  skipCount++;
                  send({ type: "article_skip", sourceId: source.id, articleTitle: articleInfo.title });
                  continue;
                }
                errorCount++;
                send({ type: "article_error", sourceId: source.id, articleTitle: articleInfo.title, error: err instanceof Error ? err.message : "Nieznany blad" });
              }
            }

            if (source.isPrivate) {
              await prisma.privateSource.update({ where: { id: source.id }, data: { lastScrapedAt: new Date() } });
            } else {
              await prisma.catalogSource.update({ where: { id: source.id }, data: { lastScrapedAt: new Date(), articleCount: { increment: newCount } } });
            }

            totalNew += newCount;
            totalSkip += skipCount;
            totalError += errorCount;

            send({ type: "source_done", sourceId: source.id, sourceName: source.name, newCount, skipCount, errorCount });
          } catch (err) {
            send({ type: "source_done", sourceId: source.id, sourceName: source.name, newCount: 0, skipCount: 0, errorCount: 1, error: err instanceof Error ? err.message : "Nieznany blad" });
            totalError++;
          }
        }

        send({ type: "done", newCount: totalNew, skipCount: totalSkip, errorCount: totalError, message: "Pobieranie zakonczone" });
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "Nieznany blad" });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Sync a connector-type source (GMAIL, LINKEDIN, TWITTER) through the connector pipeline.
 * Sends SSE progress events and returns counts.
 */
async function syncConnectorSource(
  sourceId: string,
  sourceType: string,
  sourceName: string,
  send: (event: ProgressEvent) => void,
  userId: string
): Promise<{ newCount: number; skipCount: number; errorCount: number }> {
  const fullSource = await prisma.privateSource.findUnique({
    where: { id: sourceId },
  });

  if (!fullSource || !fullSource.credentials || fullSource.status === "DISCONNECTED") {
    send({
      type: "source_done",
      sourceId,
      sourceName,
      newCount: 0,
      skipCount: 0,
      errorCount: 1,
      error: "Konektor nie jest połączony",
    });
    return { newCount: 0, skipCount: 0, errorCount: 1 };
  }

  // Mark as syncing
  await prisma.privateSource.update({
    where: { id: sourceId },
    data: { status: "SYNCING" },
  });

  try {
    const connector = await getConnector(sourceType as "GMAIL" | "LINKEDIN" | "TWITTER");
    const items = await connector.fetchItems(fullSource);

    let newCount = 0;
    let skipCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      send({
        type: "article_check",
        sourceId,
        articleUrl: item.url,
        articleTitle: item.title,
        articleIndex: i + 1,
        totalArticles: items.length,
      });

      const existing = await prisma.article.findUnique({ where: { url: item.url } });
      if (existing) {
        skipCount++;
        send({ type: "article_skip", sourceId, articleTitle: item.title });
        continue;
      }

      try {
        const createdArticle = await prisma.article.create({
          data: {
            url: item.url,
            title: item.title,
            intro: null,
            summary: null,
            author: item.author,
            publishedAt: item.publishedAt,
            privateSourceId: sourceId,
          },
        });

        await addArticleToEdition(createdArticle.id, userId);
        newCount++;
        send({ type: "article_new", sourceId, articleTitle: item.title });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          skipCount++;
          send({ type: "article_skip", sourceId, articleTitle: item.title });
        } else {
          throw err;
        }
      }
    }

    // Update sync metadata
    const config = (fullSource.config as Record<string, unknown>) || {};
    const lastId = items.length > 0 ? items[0].externalId : config.lastSyncMessageId;

    await prisma.privateSource.update({
      where: { id: sourceId },
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

    send({ type: "source_done", sourceId, sourceName, newCount, skipCount, errorCount: 0 });
    return { newCount, skipCount, errorCount: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany blad";

    await prisma.privateSource.update({
      where: { id: sourceId },
      data: {
        status: "ERROR",
        lastSyncError: message,
      },
    });

    send({
      type: "source_done",
      sourceId,
      sourceName,
      newCount: 0,
      skipCount: 0,
      errorCount: 1,
      error: message,
    });
    return { newCount: 0, skipCount: 0, errorCount: 1 };
  }
}
