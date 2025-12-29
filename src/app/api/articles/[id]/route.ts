import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        catalogSource: {
          select: { id: true, name: true, logoUrl: true },
        },
        privateSource: {
          select: { id: true, name: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Artykuł nie znaleziony" },
        { status: 404 }
      );
    }

    // Check if user has access
    if (article.privateSourceId) {
      const privateSource = await prisma.privateSource.findFirst({
        where: {
          id: article.privateSourceId,
          userId: session.userId,
        },
      });
      if (!privateSource) {
        return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
      }
    }

    // Get read/saved status
    const [readArticle, savedArticle] = await Promise.all([
      prisma.readArticle.findUnique({
        where: {
          userId_articleId: {
            userId: session.userId,
            articleId: id,
          },
        },
      }),
      prisma.savedArticle.findUnique({
        where: {
          userId_articleId: {
            userId: session.userId,
            articleId: id,
          },
        },
      }),
    ]);

    return NextResponse.json({
      article: {
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
        isRead: !!readArticle,
        isSaved: !!savedArticle,
      },
    });
  } catch (error) {
    console.error("Get article error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
