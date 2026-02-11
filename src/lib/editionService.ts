/**
 * Edition Service - manages daily article editions
 */

import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/ai/llm";

/**
 * Get or create edition for a specific date and user
 */
export async function getOrCreateEdition(
  userId: string,
  date: Date
): Promise<{ id: string; date: Date; title: string | null; articleCount: number; unreadCount: number }> {
  // Normalize to date only (no time)
  const dateOnly = new Date(date.toISOString().split("T")[0]);

  let edition = await prisma.edition.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateOnly,
      },
    },
  });

  if (!edition) {
    edition = await prisma.edition.create({
      data: {
        userId,
        date: dateOnly,
        title: formatEditionTitle(dateOnly),
      },
    });
  }

  return edition;
}

/**
 * Format edition title based on date
 */
function formatEditionTitle(date: Date): string {
  const days = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const months = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
  ];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];

  return `Wydanie z ${dayName}, ${dayNum} ${monthName}`;
}

/**
 * Add article to edition (called when scraping new articles)
 */
export async function addArticleToEdition(
  articleId: string,
  userId: string
): Promise<void> {
  const today = new Date();
  const edition = await getOrCreateEdition(userId, today);

  await prisma.article.update({
    where: { id: articleId },
    data: { editionId: edition.id },
  });

  // Update article count
  await prisma.edition.update({
    where: { id: edition.id },
    data: {
      articleCount: { increment: 1 },
      unreadCount: { increment: 1 },
    },
  });
}

/**
 * Get editions for user with pagination
 */
export async function getUserEditions(
  userId: string,
  limit = 30
): Promise<Array<{
  id: string;
  date: Date;
  title: string | null;
  summary: string | null;
  articleCount: number;
  unreadCount: number;
}>> {
  return prisma.edition.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

/**
 * Get edition by ID with articles
 */
export async function getEditionWithArticles(
  editionId: string,
  userId: string
): Promise<{
  id: string;
  date: Date;
  title: string | null;
  summary: string | null;
  articleCount: number;
  unreadCount: number;
  articles: Array<{
    id: string;
    title: string;
    intro: string | null;
    url: string;
    imageUrl: string | null;
    publishedAt: Date | null;
    catalogSource: { name: string; logoUrl: string | null } | null;
    privateSource: { name: string } | null;
    isRead: boolean;
    isSaved: boolean;
  }>;
} | null> {
  const edition = await prisma.edition.findFirst({
    where: {
      id: editionId,
      userId,
    },
    include: {
      articles: {
        orderBy: { publishedAt: "desc" },
        include: {
          catalogSource: {
            select: { name: true, logoUrl: true },
          },
          privateSource: {
            select: { name: true },
          },
          readBy: {
            where: { userId },
            select: { userId: true },
          },
          savedBy: {
            where: { userId },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!edition) return null;

  return {
    ...edition,
    articles: edition.articles.map((article) => ({
      id: article.id,
      title: article.title,
      intro: article.intro,
      url: article.url,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      catalogSource: article.catalogSource,
      privateSource: article.privateSource,
      isRead: article.readBy.length > 0,
      isSaved: article.savedBy.length > 0,
    })),
  };
}

/**
 * Update unread count when article is marked as read
 */
export async function updateEditionUnreadCount(
  editionId: string
): Promise<void> {
  const edition = await prisma.edition.findUnique({
    where: { id: editionId },
    include: {
      articles: {
        include: {
          readBy: true,
        },
      },
    },
  });

  if (!edition) return;

  const unreadCount = edition.articles.filter(
    (a) => a.readBy.length === 0
  ).length;

  await prisma.edition.update({
    where: { id: editionId },
    data: { unreadCount },
  });
}

/**
 * Generate AI summary for edition
 */
export async function generateEditionSummary(
  editionId: string
): Promise<string> {
  const edition = await prisma.edition.findUnique({
    where: { id: editionId },
    include: {
      articles: {
        select: { title: true, intro: true },
        take: 20,
      },
    },
  });

  if (!edition || edition.articles.length === 0) {
    return "";
  }

  const articleList = edition.articles
    .map((a, i) => `${i + 1}. ${a.title}${a.intro ? ` - ${a.intro}` : ""}`)
    .join("\n");

  try {
    const prompt = `Napisz krotkie podsumowanie (3-4 zdania) tego wydania wiadomosci w jezyku polskim.

ARTYKULY:
${articleList}

ZASADY:
- Wspomnij o najwazniejszych tematach
- Uzyj polskiego jezyka
- Nie uzywaj slow "wydanie", "artykuly"
- Przedstaw glowne trendy i tematy dnia

Odpowiedz TYLKO podsumowaniem.`;

    const llm = await getLLMProvider();
    const summary = await llm.generateText(prompt, { maxTokens: 300 });

    await prisma.edition.update({
      where: { id: editionId },
      data: { summary },
    });

    return summary;
  } catch (error) {
    console.error("[Edition] Error generating summary:", error);
    return "";
  }
}

/**
 * Create editions for all users based on today's articles
 * This is called by a cron job
 */
export async function createDailyEditions(): Promise<number> {
  const today = new Date();
  const todayStart = new Date(today.toISOString().split("T")[0]);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Get all users with subscriptions
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { subscriptions: { some: {} } },
        { privateSources: { some: { isActive: true } } },
      ],
    },
    select: { id: true },
  });

  let created = 0;

  for (const user of users) {
    // Check if edition already exists
    const existing = await prisma.edition.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: todayStart,
        },
      },
    });

    if (existing) continue;

    // Get today's articles for this user
    const articles = await prisma.article.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
        OR: [
          {
            catalogSource: {
              subscriptions: {
                some: { userId: user.id },
              },
            },
          },
          {
            privateSource: {
              userId: user.id,
              isActive: true,
            },
          },
        ],
      },
      select: { id: true },
    });

    if (articles.length === 0) continue;

    // Create edition
    const edition = await prisma.edition.create({
      data: {
        userId: user.id,
        date: todayStart,
        title: formatEditionTitle(todayStart),
        articleCount: articles.length,
        unreadCount: articles.length,
      },
    });

    // Link articles to edition
    await prisma.article.updateMany({
      where: {
        id: { in: articles.map((a) => a.id) },
      },
      data: { editionId: edition.id },
    });

    // Generate summary
    await generateEditionSummary(edition.id);

    created++;
  }

  return created;
}

/**
 * Backfill editions from existing articles
 * Groups articles by date and creates editions for each day
 */
export async function backfillEditions(userId: string): Promise<number> {
  // Get user's subscribed sources
  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId },
    select: { catalogSourceId: true },
  });
  const subscribedSourceIds = subscriptions.map((s) => s.catalogSourceId);

  // Get user's private sources
  const privateSources = await prisma.privateSource.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });
  const privateSourceIds = privateSources.map((p) => p.id);

  if (subscribedSourceIds.length === 0 && privateSourceIds.length === 0) {
    return 0;
  }

  // Get all articles for user's sources without edition
  const articles = await prisma.article.findMany({
    where: {
      editionId: null,
      OR: [
        { catalogSourceId: { in: subscribedSourceIds } },
        { privateSourceId: { in: privateSourceIds } },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      readBy: { where: { userId }, select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (articles.length === 0) {
    return 0;
  }

  // Group articles by date
  const articlesByDate = new Map<string, typeof articles>();
  for (const article of articles) {
    const dateKey = article.createdAt.toISOString().split("T")[0];
    if (!articlesByDate.has(dateKey)) {
      articlesByDate.set(dateKey, []);
    }
    articlesByDate.get(dateKey)!.push(article);
  }

  let created = 0;

  // Create edition for each date
  for (const [dateStr, dateArticles] of articlesByDate) {
    const date = new Date(dateStr);

    // Check if edition already exists
    const existing = await prisma.edition.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    if (existing) {
      // Link articles to existing edition
      await prisma.article.updateMany({
        where: { id: { in: dateArticles.map((a) => a.id) } },
        data: { editionId: existing.id },
      });

      // Update counts
      await prisma.edition.update({
        where: { id: existing.id },
        data: {
          articleCount: { increment: dateArticles.length },
          unreadCount: {
            increment: dateArticles.filter((a) => a.readBy.length === 0).length,
          },
        },
      });
      continue;
    }

    // Create new edition
    const unreadCount = dateArticles.filter((a) => a.readBy.length === 0).length;

    const edition = await prisma.edition.create({
      data: {
        userId,
        date,
        title: formatEditionTitle(date),
        articleCount: dateArticles.length,
        unreadCount,
      },
    });

    // Link articles to edition
    await prisma.article.updateMany({
      where: { id: { in: dateArticles.map((a) => a.id) } },
      data: { editionId: edition.id },
    });

    created++;
  }

  return created;
}
