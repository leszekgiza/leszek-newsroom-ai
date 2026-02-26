import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateEditionCounts } from "@/lib/editionService";

// POST - dismiss article (move to trash)
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

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Artykul nie znaleziony" },
        { status: 404 }
      );
    }

    // Add to dismissed (create + catch duplicate for robustness)
    try {
      await prisma.dismissedArticle.create({
        data: {
          userId: session.userId,
          articleId: id,
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Already dismissed - update timestamp
        await prisma.dismissedArticle.update({
          where: {
            userId_articleId: {
              userId: session.userId,
              articleId: id,
            },
          },
          data: { dismissedAt: new Date() },
        });
      } else {
        throw e;
      }
    }

    let editionUpdate = null;
    if (article.editionId) {
      const counts = await updateEditionCounts(article.editionId, session.userId);
      editionUpdate = { editionId: article.editionId, ...counts };
    }

    return NextResponse.json({ dismissed: true, edition: editionUpdate });
  } catch (error) {
    console.error(
      "Dismiss article error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Wystapil blad" },
      { status: 500 }
    );
  }
}

// DELETE - restore article from trash
export async function DELETE(
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
      select: { editionId: true },
    });

    await prisma.dismissedArticle.deleteMany({
      where: {
        userId: session.userId,
        articleId: id,
      },
    });

    let editionUpdate = null;
    if (article?.editionId) {
      const counts = await updateEditionCounts(article.editionId, session.userId);
      editionUpdate = { editionId: article.editionId, ...counts };
    }

    return NextResponse.json({ dismissed: false, edition: editionUpdate });
  } catch (error) {
    console.error("Restore article error:", error);
    return NextResponse.json(
      { error: "Wystapil blad" },
      { status: 500 }
    );
  }
}
