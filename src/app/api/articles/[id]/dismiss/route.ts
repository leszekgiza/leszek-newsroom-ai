import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

    // Add to dismissed
    await prisma.dismissedArticle.upsert({
      where: {
        userId_articleId: {
          userId: session.userId,
          articleId: id,
        },
      },
      update: {
        dismissedAt: new Date(),
      },
      create: {
        userId: session.userId,
        articleId: id,
      },
    });

    return NextResponse.json({ dismissed: true });
  } catch (error) {
    console.error("Dismiss article error:", error);
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

    await prisma.dismissedArticle.deleteMany({
      where: {
        userId: session.userId,
        articleId: id,
      },
    });

    return NextResponse.json({ dismissed: false });
  } catch (error) {
    console.error("Restore article error:", error);
    return NextResponse.json(
      { error: "Wystapil blad" },
      { status: 500 }
    );
  }
}
