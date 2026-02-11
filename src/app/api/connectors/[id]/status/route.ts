import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/factory";

export async function GET(
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
      include: { _count: { select: { articles: true } } },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Connector not found" },
        { status: 404 }
      );
    }

    const connector = await getConnector(source.type);
    const connectionStatus = await connector.getConnectionStatus(source);

    return NextResponse.json({
      id: source.id,
      type: source.type,
      status: connectionStatus.status,
      profileName: connectionStatus.profileName,
      lastSyncAt: source.lastScrapedAt,
      lastSyncError: source.lastSyncError,
      articleCount: source._count.articles,
      error: connectionStatus.error,
    });
  } catch (error) {
    console.error("Connector status error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
