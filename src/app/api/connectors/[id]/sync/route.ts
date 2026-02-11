import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/factory";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const source = await prisma.privateSource.findFirst({
      where: { id, userId: session.userId },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    if (source.status === "SYNCING") {
      return NextResponse.json(
        { error: "Sync already in progress" },
        { status: 409 }
      );
    }

    if (source.status === "DISCONNECTED" || !source.credentials) {
      return NextResponse.json(
        { error: "Connector is not connected" },
        { status: 400 }
      );
    }

    // Mark as syncing
    await prisma.privateSource.update({
      where: { id: source.id },
      data: { status: "SYNCING" },
    });

    try {
      const connector = await getConnector(source.type);
      const items = await connector.fetchItems(source);

      // Upsert articles
      let newCount = 0;
      for (const item of items) {
        const existing = await prisma.article.findUnique({
          where: { url: item.url },
        });
        if (!existing) {
          await prisma.article.create({
            data: {
              url: item.url,
              title: item.title,
              intro: null,
              summary: null,
              author: item.author,
              publishedAt: item.publishedAt,
              privateSourceId: source.id,
            },
          });
          newCount++;
        }
      }

      // Update sync metadata
      const config = (source.config as Record<string, unknown>) || {};
      const lastId = items.length > 0 ? items[0].externalId : config.lastSyncMessageId;

      await prisma.privateSource.update({
        where: { id: source.id },
        data: {
          status: "CONNECTED",
          lastScrapedAt: new Date(),
          lastSyncError: null,
          config: {
            ...config,
            lastSyncMessageId: lastId,
          } as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({
        success: true,
        newArticles: newCount,
        totalFetched: items.length,
      });
    } catch (syncError) {
      const message =
        syncError instanceof Error ? syncError.message : "Sync failed";

      await prisma.privateSource.update({
        where: { id: source.id },
        data: {
          status: "ERROR",
          lastSyncError: message,
        },
      });

      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Connector sync error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
