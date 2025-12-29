import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get dismissed articles
    const dismissedArticles = await prisma.dismissedArticle.findMany({
      where: { userId: session.userId },
      include: {
        article: {
          include: {
            catalogSource: {
              select: { id: true, name: true, logoUrl: true },
            },
            privateSource: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { dismissedAt: "desc" },
    });

    // Get read articles for isRead status
    const readArticles = await prisma.readArticle.findMany({
      where: { userId: session.userId },
      select: { articleId: true },
    });
    const readArticleIds = new Set(readArticles.map((r) => r.articleId));

    // Get saved articles for isSaved status
    const savedArticles = await prisma.savedArticle.findMany({
      where: { userId: session.userId },
      select: { articleId: true },
    });
    const savedArticleIds = new Set(savedArticles.map((s) => s.articleId));

    // Transform articles
    const transformedArticles = dismissedArticles.map((dismissed) => {
      const article = dismissed.article;
      return {
        id: article.id,
        url: article.url,
        title: article.title,
        intro: article.intro,
        summary: article.summary,
        imageUrl: article.imageUrl,
        author: article.author,
        publishedAt: article.publishedAt?.toISOString() || null,
        dismissedAt: dismissed.dismissedAt.toISOString(),
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
      };
    });

    return NextResponse.json({
      articles: transformedArticles,
      count: transformedArticles.length,
    });
  } catch (error) {
    console.error("Get trash error:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania kosza" },
      { status: 500 }
    );
  }
}
