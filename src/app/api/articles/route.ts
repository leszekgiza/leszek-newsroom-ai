import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      OR: [
        {
          catalogSourceId: {
            in: subscribedSourceIds.filter((id) => !hiddenSourceIds.includes(id)),
          },
        },
        {
          privateSourceId: { in: privateSourceIds },
        },
      ],
    };

    // Filter by specific source if provided
    if (sourceId) {
      whereClause.OR = [
        { catalogSourceId: sourceId },
        { privateSourceId: sourceId },
      ];
    }

    // Filter by search term
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      whereClause.AND = [
        {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { intro: { contains: searchTerm, mode: "insensitive" } },
            { summary: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
      ];
    }

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
      orderBy: { publishedAt: "desc" },
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

    return NextResponse.json({
      articles: transformedArticles,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + articles.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Get articles error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania artykułów" },
      { status: 500 }
    );
  }
}
