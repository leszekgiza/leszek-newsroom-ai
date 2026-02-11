import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/factory";

export async function POST() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const source = await prisma.privateSource.findFirst({
      where: { userId: session.userId, type: "LINKEDIN" },
    });

    if (!source) {
      return NextResponse.json(
        { error: "LinkedIn nie jest połączony" },
        { status: 404 }
      );
    }

    try {
      const connector = await getConnector("LINKEDIN");
      await connector.disconnect(source);
    } catch {
      // Best-effort
    }

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
    console.error("LinkedIn disconnect error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
