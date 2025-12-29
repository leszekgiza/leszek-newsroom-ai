import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
        { error: "Artykuł nie znaleziony" },
        { status: 404 }
      );
    }

    // Mark as read (upsert to avoid duplicates)
    await prisma.readArticle.upsert({
      where: {
        userId_articleId: {
          userId: session.userId,
          articleId: id,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        userId: session.userId,
        articleId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
