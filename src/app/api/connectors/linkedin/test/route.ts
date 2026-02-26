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

    const connector = await getConnector("LINKEDIN");
    const status = await connector.getConnectionStatus(source);

    return NextResponse.json({
      success: status.status === "CONNECTED" || status.status === "SYNCING",
      status: status.status,
      profileName: status.profileName,
      config: source.config,
      error: status.error,
    });
  } catch (error) {
    console.error("LinkedIn test error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
