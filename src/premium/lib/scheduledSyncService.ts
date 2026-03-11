// Copyright (c) Leszek Giza. Commercial license — see src/premium/LICENSE-PREMIUM

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { scrapeArticlesList, scrapeUrl, checkScraperHealth, SourceConfig } from '@/lib/scrapeService';
import { generatePolishIntro } from '@/lib/aiService';
import { addArticleToEdition } from '@/lib/editionService';
import { getConnector } from '@/lib/connectors/factory';

const CONNECTOR_TYPES = new Set(['GMAIL', 'LINKEDIN', 'TWITTER']);

export interface ScheduledSyncRunResult {
  usersProcessed: number;
  usersSkipped: number;
  totalArticlesNew: number;
  totalErrors: number;
  userResults: SyncResult[];
  durationMs: number;
}

export interface SyncResult {
  userId: string;
  sourcesProcessed: number;
  articlesNew: number;
  articlesSkipped: number;
  errors: string[];
  durationMs: number;
}

export interface SyncUser {
  id: string;
  syncEnabled: boolean;
  syncHour: number;
  syncDays: string;
  syncTimezone: string;
  lastScheduledSync: Date | null;
}

/**
 * Check if a user is due for scheduled sync at the given time.
 * Compares current hour in user's timezone with syncHour,
 * checks day-of-week, and ensures no sync already happened today.
 */
export function isUserDueForSync(user: SyncUser, now: Date): boolean {
  if (!user.syncEnabled) return false;

  // Convert current time to user's timezone
  const userNow = new Date(now.toLocaleString('en-US', { timeZone: user.syncTimezone }));
  const userHour = userNow.getHours();
  const userDayOfWeek = userNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Convert JS day (0=Sun) to our format (1=Mon, 7=Sun)
  const dayNumber = userDayOfWeek === 0 ? 7 : userDayOfWeek;

  // Check if current hour matches
  if (userHour !== user.syncHour) return false;

  // Check if today's day is in syncDays
  const allowedDays = user.syncDays.split(',').map(d => parseInt(d.trim(), 10));
  if (!allowedDays.includes(dayNumber)) return false;

  // Check if already synced today (in user's timezone)
  if (user.lastScheduledSync) {
    const lastSyncLocal = new Date(
      user.lastScheduledSync.toLocaleString('en-US', { timeZone: user.syncTimezone })
    );
    if (
      lastSyncLocal.getFullYear() === userNow.getFullYear() &&
      lastSyncLocal.getMonth() === userNow.getMonth() &&
      lastSyncLocal.getDate() === userNow.getDate()
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Main orchestrator: find all sync-enabled users, check if due, sync each.
 * Isolates errors per user so one failure doesn't block others.
 */
export async function runScheduledSync(): Promise<ScheduledSyncRunResult> {
  const startTime = Date.now();
  const now = new Date();

  const result: ScheduledSyncRunResult = {
    usersProcessed: 0,
    usersSkipped: 0,
    totalArticlesNew: 0,
    totalErrors: 0,
    userResults: [],
    durationMs: 0,
  };

  const users = await prisma.user.findMany({
    where: { syncEnabled: true },
    select: {
      id: true,
      syncEnabled: true,
      syncHour: true,
      syncDays: true,
      syncTimezone: true,
      lastScheduledSync: true,
    },
  });

  console.log(`[SCHED] Found ${users.length} users with sync enabled`);

  for (const user of users) {
    if (!isUserDueForSync(user, now)) {
      result.usersSkipped++;
      continue;
    }

    console.log(`[SCHED] Starting sync for user ${user.id} (${result.usersProcessed + 1})`);

    try {
      const userResult = await syncSourcesForUser(user.id);
      result.userResults.push(userResult);
      result.usersProcessed++;
      result.totalArticlesNew += userResult.articlesNew;
      result.totalErrors += userResult.errors.length;

      await prisma.user.update({
        where: { id: user.id },
        data: { lastScheduledSync: now },
      });

      console.log(
        `[SCHED] User ${user.id}: ${userResult.articlesNew} new, ` +
        `${userResult.articlesSkipped} skipped, ${userResult.errors.length} errors, ` +
        `${userResult.durationMs}ms`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SCHED] User ${user.id} FAILED:`, msg);
      result.totalErrors++;
    }
  }

  result.durationMs = Date.now() - startTime;
  console.log(
    `[SCHED] Run complete: ${result.usersProcessed} processed, ` +
    `${result.usersSkipped} skipped, ${result.totalArticlesNew} new articles, ` +
    `${result.totalErrors} errors, ${result.durationMs}ms total`
  );

  return result;
}

/**
 * Sync all sources for a single user.
 * Isolates errors per source so one failure doesn't block others.
 */
export async function syncSourcesForUser(userId: string): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    userId,
    sourcesProcessed: 0,
    articlesNew: 0,
    articlesSkipped: 0,
    errors: [],
    durationMs: 0,
  };

  // 1. Load user's active private sources
  const privateSources = await prisma.privateSource.findMany({
    where: { userId, isActive: true },
  });

  // 2. Load user's catalog subscriptions (active catalog sources only)
  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId },
    include: { catalogSource: true },
  });
  const catalogSources = subscriptions
    .map(s => s.catalogSource)
    .filter(cs => cs.isActive);

  // 3. Process each private source
  for (const source of privateSources) {
    result.sourcesProcessed++;
    try {
      if (CONNECTOR_TYPES.has(source.type)) {
        const sourceResult = await syncConnectorSource(source, userId);
        result.articlesNew += sourceResult.articlesNew;
        result.articlesSkipped += sourceResult.articlesSkipped;
      } else {
        const sourceResult = await syncScraperSource(
          { id: source.id, name: source.name, url: source.url, config: source.config },
          userId,
          'private',
        );
        result.articlesNew += sourceResult.articlesNew;
        result.articlesSkipped += sourceResult.articlesSkipped;
      }
    } catch (error) {
      result.errors.push(
        `${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // 4. Process each catalog source subscription
  for (const cs of catalogSources) {
    result.sourcesProcessed++;
    try {
      const sourceResult = await syncScraperSource(
        { id: cs.id, name: cs.name, url: cs.url, config: null },
        userId,
        'catalog',
      );
      result.articlesNew += sourceResult.articlesNew;
      result.articlesSkipped += sourceResult.articlesSkipped;
    } catch (error) {
      result.errors.push(
        `${cs.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

/** Sync a connector-type source (GMAIL, LINKEDIN, TWITTER). */
async function syncConnectorSource(
  source: { id: string; type: string; status: string; credentials: string | null; config: Prisma.JsonValue; name: string },
  userId: string,
): Promise<{ articlesNew: number; articlesSkipped: number }> {
  let articlesNew = 0;
  let articlesSkipped = 0;

  if (source.status === 'DISCONNECTED' || !source.credentials) {
    throw new Error('Connector not connected');
  }

  // Mark as syncing
  await prisma.privateSource.update({
    where: { id: source.id },
    data: { status: 'SYNCING' },
  });

  try {
    const connector = await getConnector(source.type as 'GMAIL' | 'LINKEDIN' | 'TWITTER');
    const fullSource = await prisma.privateSource.findUnique({ where: { id: source.id } });
    if (!fullSource) throw new Error('Source not found');

    const items = await connector.fetchItems(fullSource);

    for (const item of items) {
      const existing = await prisma.article.findUnique({ where: { url: item.url } });
      if (existing) {
        articlesSkipped++;
        continue;
      }

      try {
        let intro: string | null = null;
        if (item.content) {
          try {
            intro = await generatePolishIntro(item.title, item.content);
          } catch {
            // AI intro generation is non-critical
          }
        }

        const createdArticle = await prisma.article.create({
          data: {
            url: item.url,
            title: item.title,
            intro,
            summary: null,
            author: item.author,
            publishedAt: item.publishedAt,
            privateSourceId: source.id,
          },
        });
        await addArticleToEdition(createdArticle.id, userId);
        articlesNew++;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          articlesSkipped++;
        } else {
          throw err;
        }
      }
    }

    // Update sync metadata
    const config = (fullSource.config as Record<string, unknown>) || {};
    await prisma.privateSource.update({
      where: { id: source.id },
      data: {
        status: 'CONNECTED',
        lastScrapedAt: new Date(),
        lastSyncError: null,
        config: {
          ...config,
          lastSyncMessageId: items.length > 0 ? items[0].externalId : config.lastSyncMessageId,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await prisma.privateSource.update({
      where: { id: source.id },
      data: {
        status: 'ERROR',
        lastSyncError: error instanceof Error ? error.message : 'Sync failed',
      },
    });
    throw error;
  }

  return { articlesNew, articlesSkipped };
}

/** Sync a scraper-type source (WEBSITE, RSS) using Crawl4AI. */
async function syncScraperSource(
  source: { id: string; name: string; url: string; config: Prisma.JsonValue },
  userId: string,
  sourceType: 'private' | 'catalog',
): Promise<{ articlesNew: number; articlesSkipped: number }> {
  let articlesNew = 0;
  let articlesSkipped = 0;

  const scraperHealthy = await checkScraperHealth();
  if (!scraperHealthy) {
    throw new Error('Scraper service unavailable');
  }

  const sourceConfig: SourceConfig | null = source.config
    ? (source.config as SourceConfig)
    : null;

  const articlesResult = await scrapeArticlesList(source.url, 20, sourceConfig);
  if (!articlesResult.success) {
    throw new Error(`Scrape failed: ${articlesResult.error}`);
  }

  for (const articleInfo of articlesResult.articles) {
    try {
      const existing = await prisma.article.findUnique({ where: { url: articleInfo.url } });
      if (existing) {
        articlesSkipped++;
        continue;
      }

      const articleContent = await scrapeUrl(articleInfo.url);
      if (!articleContent.success) {
        continue;
      }

      const intro = await generatePolishIntro(
        articleContent.title || articleInfo.title,
        articleContent.markdown || '',
      );

      const articleData: Record<string, unknown> = {
        url: articleInfo.url,
        title: articleContent.title || articleInfo.title,
        intro: intro || null,
        summary: null,
        imageUrl: null,
        author: articleInfo.author || null,
        publishedAt: articleInfo.date ? new Date(articleInfo.date) : null,
      };

      if (sourceType === 'private') {
        articleData.privateSourceId = source.id;
      } else {
        articleData.catalogSourceId = source.id;
      }

      const createdArticle = await prisma.article.create({ data: articleData as Prisma.ArticleCreateInput });
      await addArticleToEdition(createdArticle.id, userId);
      articlesNew++;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        articlesSkipped++;
      }
      // Per-article errors are non-fatal — continue with next article
    }
  }

  // Update lastScrapedAt
  if (sourceType === 'private') {
    await prisma.privateSource.update({
      where: { id: source.id },
      data: { lastScrapedAt: new Date() },
    });
  } else {
    await prisma.catalogSource.update({
      where: { id: source.id },
      data: { lastScrapedAt: new Date(), articleCount: { increment: articlesNew } },
    });
  }

  return { articlesNew, articlesSkipped };
}
