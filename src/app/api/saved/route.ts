import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedArticles = await prisma.savedArticle.findMany({
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
      orderBy: { savedAt: "desc" },
    });

    const articles = savedArticles.map((saved) => ({
      id: saved.article.id,
      url: saved.article.url,
      title: saved.article.title,
      intro: saved.article.intro,
      summary: saved.article.summary,
      imageUrl: saved.article.imageUrl,
      author: saved.article.author,
      publishedAt: saved.article.publishedAt?.toISOString() || null,
      savedAt: saved.savedAt.toISOString(),
      source: saved.article.catalogSource
        ? {
            id: saved.article.catalogSource.id,
            name: saved.article.catalogSource.name,
            logoUrl: saved.article.catalogSource.logoUrl,
          }
        : {
            id: saved.article.privateSource!.id,
            name: saved.article.privateSource!.name,
            logoUrl: null,
          },
      isRead: true, // Saved articles are considered read
      isSaved: true,
    }));

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Get saved articles error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: "ID artykułu jest wymagane" },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Artykuł nie znaleziony" },
        { status: 404 }
      );
    }

    // Toggle save status
    const existingSave = await prisma.savedArticle.findUnique({
      where: {
        userId_articleId: {
          userId: session.userId,
          articleId,
        },
      },
    });

    if (existingSave) {
      // Remove from saved
      await prisma.savedArticle.delete({
        where: {
          userId_articleId: {
            userId: session.userId,
            articleId,
          },
        },
      });
      return NextResponse.json({ saved: false });
    } else {
      // Add to saved
      await prisma.savedArticle.create({
        data: {
          userId: session.userId,
          articleId,
        },
      });
      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error("Toggle save error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
