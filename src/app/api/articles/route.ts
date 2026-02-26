import { NextRequest, NextResponse } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { searchArticles } from "@/lib/searchService";

/** Extract display name from email-style author: "Name" <email> → Name */
function extractDisplayName(author: string): string {
  const match = author.match(/^"?(.+?)"?\s*<.+>$/);
  return match ? match[1] : author;
}

/** Parse composite sourceId into filter components */
function parseCompositeSourceId(sourceId: string): {
  catalogSourceId?: string;
  privateSourceId?: string;
  author?: string;
} {
  if (sourceId.startsWith("private:")) {
    const parts = sourceId.split(":");
    const privSourceId = parts[1];
    const author = decodeURIComponent(parts.slice(2).join(":"));
    return { privateSourceId: privSourceId, ...(author ? { author } : {}) };
  } else if (sourceId.startsWith("catalog:")) {
    return { catalogSourceId: sourceId.substring(8) };
  }
  // Legacy: raw sourceId
  return {};
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get("sourceId");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's subscribed catalog sources
    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId: session.userId },
      select: { catalogSourceId: true },
    });

    // Get user's hidden sources
    const hiddenSources = await prisma.hiddenCatalogSource.findMany({
      where: { userId: session.userId },
      select: { catalogSourceId: true },
    });

    const subscribedSourceIds = subscriptions.map((s) => s.catalogSourceId);
    const hiddenSourceIds = hiddenSources.map((h) => h.catalogSourceId);

    // Get user's private sources
    const privateSources = await prisma.privateSource.findMany({
      where: { userId: session.userId, isActive: true },
      select: { id: true },
    });

    const privateSourceIds = privateSources.map((p) => p.id);

    // Get read articles
    const readArticles = await prisma.readArticle.findMany({
      where: { userId: session.userId },
      select: { articleId: true },
    });
    const readArticleIds = new Set(readArticles.map((r) => r.articleId));

    // Get saved articles
    const savedArticles = await prisma.savedArticle.findMany({
      where: { userId: session.userId },
      select: { articleId: true },
    });
    const savedArticleIds = new Set(savedArticles.map((s) => s.articleId));

    // Get dismissed articles (to filter out from main feed)
    const dismissedArticles = await prisma.dismissedArticle.findMany({
      where: { userId: session.userId },
      select: { articleId: true },
    });
    const dismissedArticleIds = dismissedArticles.map((d) => d.articleId);

    // Filter subscribed sources (exclude hidden)
    const activeSubscribedIds = subscribedSourceIds.filter(
      (id) => !hiddenSourceIds.includes(id)
    );

    // ========== FTS Search Branch ==========
    // Use PostgreSQL Full-Text Search for queries >= 2 characters
    if (search && search.trim().length >= 2) {
      // Parse composite sourceId for FTS
      let ftsSourceFilter: string | null = null;
      let ftsAuthorFilter: string | undefined;
      if (sourceId) {
        const parsed = parseCompositeSourceId(sourceId);
        if (parsed.privateSourceId) {
          ftsSourceFilter = parsed.privateSourceId;
          ftsAuthorFilter = parsed.author;
        } else if (parsed.catalogSourceId) {
          ftsSourceFilter = parsed.catalogSourceId;
        } else {
          // Legacy raw ID
          ftsSourceFilter = sourceId;
        }
      }

      const { articles: searchResults, total } = await searchArticles(pool, {
        query: search,
        subscribedSourceIds: activeSubscribedIds,
        privateSourceIds: privateSourceIds,
        dismissedArticleIds,
        sourceFilter: ftsSourceFilter,
        author: ftsAuthorFilter,
        limit,
        offset,
      });

      // If no results, return early
      if (searchResults.length === 0) {
        return NextResponse.json({
          articles: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
          searchQuery: search,
        });
      }

      // Fetch source details for results
      const catalogSourceIds = [
        ...new Set(
          searchResults
            .map((a) => a.catalogSourceId)
            .filter((id): id is string => id !== null)
        ),
      ];
      const privateSourceIdsFromResults = [
        ...new Set(
          searchResults
            .map((a) => a.privateSourceId)
            .filter((id): id is string => id !== null)
        ),
      ];

      const [catalogSourcesData, privateSourcesData] = await Promise.all([
        catalogSourceIds.length > 0
          ? prisma.catalogSource.findMany({
              where: { id: { in: catalogSourceIds } },
              select: { id: true, name: true, logoUrl: true },
            })
          : [],
        privateSourceIdsFromResults.length > 0
          ? prisma.privateSource.findMany({
              where: { id: { in: privateSourceIdsFromResults } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const catalogSourceMap = new Map(
        catalogSourcesData.map((s) => [s.id, s])
      );
      const privateSourceMap = new Map(
        privateSourcesData.map((s) => [s.id, s])
      );

      const transformedArticles = searchResults.map((article) => {
        const catalogSource = article.catalogSourceId
          ? catalogSourceMap.get(article.catalogSourceId)
          : null;
        const privateSource = article.privateSourceId
          ? privateSourceMap.get(article.privateSourceId)
          : null;

        return {
          id: article.id,
          url: article.url,
          title: article.title,
          intro: article.intro,
          summary: article.summary,
          imageUrl: article.imageUrl,
          author: article.author,
          publishedAt: article.publishedAt?.toISOString() || null,
          createdAt: article.createdAt.toISOString(),
          source: catalogSource
            ? {
                id: catalogSource.id,
                name: catalogSource.name,
                logoUrl: catalogSource.logoUrl,
              }
            : {
                id: privateSource!.id,
                name: privateSource!.name,
                logoUrl: null,
              },
          isRead: readArticleIds.has(article.id),
          isSaved: savedArticleIds.has(article.id),
          // FTS-specific fields
          relevance: article.rank,
          highlight: article.headline,
        };
      });

      return NextResponse.json({
        articles: transformedArticles,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + searchResults.length < total,
        },
        searchQuery: search,
      });
    }
    // ========== End FTS Search Branch ==========

    // Regular Prisma query (no search or search < 2 chars)
    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      OR: [
        {
          catalogSourceId: {
            in: activeSubscribedIds,
          },
        },
        {
          privateSourceId: { in: privateSourceIds },
        },
      ],
    };

    // Filter by specific source if provided (supports composite IDs)
    if (sourceId) {
      const parsed = parseCompositeSourceId(sourceId);
      if (parsed.privateSourceId) {
        whereClause.OR = [{ privateSourceId: parsed.privateSourceId }];
        if (parsed.author) {
          whereClause.author = parsed.author;
        }
      } else if (parsed.catalogSourceId) {
        whereClause.OR = [{ catalogSourceId: parsed.catalogSourceId }];
      } else {
        // Legacy: raw sourceId
        whereClause.OR = [
          { catalogSourceId: sourceId },
          { privateSourceId: sourceId },
        ];
      }
    }

    // Filter out dismissed articles
    if (dismissedArticleIds.length > 0) {
      whereClause.NOT = { id: { in: dismissedArticleIds } };
    }

    // Fetch articles
    const articles = await prisma.article.findMany({
      where: whereClause,
      include: {
        catalogSource: {
          select: { id: true, name: true, logoUrl: true },
        },
        privateSource: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: limit,
      skip: offset,
    });

    // Transform articles
    const transformedArticles = articles.map((article) => ({
      id: article.id,
      url: article.url,
      title: article.title,
      intro: article.intro,
      summary: article.summary,
      imageUrl: article.imageUrl,
      author: article.author,
      publishedAt: article.publishedAt?.toISOString() || null,
      createdAt: article.createdAt.toISOString(),
      source: article.catalogSource
        ? {
            id: article.catalogSource.id,
            name: article.catalogSource.name,
            logoUrl: article.catalogSource.logoUrl,
          }
        : {
            id: article.privateSource!.id,
            name: article.privateSource!.name,
            logoUrl: null,
          },
      isRead: readArticleIds.has(article.id),
      isSaved: savedArticleIds.has(article.id),
    }));

    // Get total count
    const totalCount = await prisma.article.count({ where: whereClause });

    // Build source counts from ALL articles (not just current page)
    // Only on first page load (offset === 0) to avoid extra queries on pagination
    let sourceCounts: { id: string; name: string; logoUrl?: string | null; count: number }[] = [];
    if (offset === 0 && !sourceId) {
      // Count articles per source (undismissed only)
      const dismissedFilter = dismissedArticleIds.length > 0
        ? { NOT: { id: { in: dismissedArticleIds } } }
        : {};

      const [catalogCounts, privateCounts] = await Promise.all([
        activeSubscribedIds.length > 0
          ? prisma.article.groupBy({
              by: ["catalogSourceId"],
              where: {
                catalogSourceId: { in: activeSubscribedIds },
                ...dismissedFilter,
              },
              _count: true,
            })
          : [],
        // Group private sources by (privateSourceId, author) for per-author entries
        privateSourceIds.length > 0
          ? prisma.article.groupBy({
              by: ["privateSourceId", "author"],
              where: {
                privateSourceId: { in: privateSourceIds },
                ...dismissedFilter,
              },
              _count: true,
            })
          : [],
      ]);

      // Fetch source names
      const catalogIds = catalogCounts
        .map((c) => c.catalogSourceId)
        .filter((id): id is string => id !== null);
      const privIds = privateCounts
        .map((c) => c.privateSourceId)
        .filter((id): id is string => id !== null);

      const [catalogSources, privateSrcData] = await Promise.all([
        catalogIds.length > 0
          ? prisma.catalogSource.findMany({
              where: { id: { in: catalogIds } },
              select: { id: true, name: true, logoUrl: true },
            })
          : [],
        privIds.length > 0
          ? prisma.privateSource.findMany({
              where: { id: { in: [...new Set(privIds)] } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const catalogMap = new Map(catalogSources.map((s) => [s.id, s]));
      const privateMap = new Map(privateSrcData.map((s) => [s.id, s]));

      // Catalog sources: one entry per source (unchanged)
      for (const c of catalogCounts) {
        const src = catalogMap.get(c.catalogSourceId!);
        if (src) {
          sourceCounts.push({
            id: `catalog:${src.id}`,
            name: src.name,
            logoUrl: src.logoUrl,
            count: c._count,
          });
        }
      }

      // Private sources: one entry per (source, author) pair
      for (const c of privateCounts) {
        const src = privateMap.get(c.privateSourceId!);
        if (!src) continue;

        const author = c.author;
        if (author) {
          // Per-author entry with composite ID
          const displayName = extractDisplayName(author);
          sourceCounts.push({
            id: `private:${src.id}:${encodeURIComponent(author)}`,
            name: displayName,
            count: c._count,
          });
        } else {
          // NULL author - group under source name
          sourceCounts.push({
            id: `private:${src.id}:`,
            name: src.name,
            count: c._count,
          });
        }
      }

      sourceCounts.sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      articles: transformedArticles,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + articles.length < totalCount,
      },
      ...(sourceCounts.length > 0 ? { sources: sourceCounts } : {}),
    });
  } catch (error) {
    console.error("Get articles error:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania artykulow" },
      { status: 500 }
    );
  }
}
