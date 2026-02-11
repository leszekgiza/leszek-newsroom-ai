import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/factory";

export async function DELETE(
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

    // Try to disconnect (revoke tokens etc.)
    try {
      const connector = await getConnector(source.type);
      await connector.disconnect(source);
    } catch {
      // Best-effort
    }

    // Clear credentials and mark as disconnected
    await prisma.privateSource.update({
      where: { id: source.id },
      data: {
        credentials: null,
        status: "DISCONNECTED",
        lastSyncError: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Connector disconnect error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
