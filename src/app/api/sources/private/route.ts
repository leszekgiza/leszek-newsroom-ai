import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const privateSources = await prisma.privateSource.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    const sources = privateSources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      type: source.type,
      isActive: source.isActive,
      lastScrapedAt: source.lastScrapedAt?.toISOString() || null,
      articleCount: source._count.articles,
      createdAt: source.createdAt.toISOString(),
    }));

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Get private sources error:", error);
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

    const { name, url, type, config, credentials } = await request.json();

    if (!name || !url) {
      return NextResponse.json(
        { error: "Nazwa i URL są wymagane" },
        { status: 400 }
      );
    }

    // Check if source already exists for this user
    const existing = await prisma.privateSource.findFirst({
      where: {
        userId: session.userId,
        url,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "To źródło już istnieje" },
        { status: 400 }
      );
    }

    // Create source
    const source = await prisma.privateSource.create({
      data: {
        userId: session.userId,
        name,
        url,
        type: type || "WEBSITE",
        config: config || null,
        credentials: credentials ? encrypt(credentials) : null,
      },
    });

    return NextResponse.json({
      source: {
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.type,
        isActive: source.isActive,
        createdAt: source.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create private source error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
