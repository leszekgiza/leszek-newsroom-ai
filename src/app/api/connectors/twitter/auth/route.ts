import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnector } from "@/lib/connectors/factory";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { authToken, ct0, username, password, disclaimerAccepted } = body;

    if (!disclaimerAccepted) {
      return NextResponse.json(
        { error: "Musisz zaakceptować disclaimer" },
        { status: 400 }
      );
    }

    if (!authToken && !ct0 && !username && !password) {
      return NextResponse.json(
        { error: "Podaj cookies (auth_token+ct0) lub login+hasło" },
        { status: 400 }
      );
    }

    const connector = await getConnector("TWITTER");
    const authResult = await connector.authenticate({
      authToken,
      ct0,
      username,
      password,
    });

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Autoryzacja nie powiodła się" },
        { status: 400 }
      );
    }

    await prisma.privateSource.upsert({
      where: {
        userId_url: {
          userId: session.userId,
          url: "twitter://timeline",
        },
      },
      update: {
        credentials: authResult.credentials,
        status: "CONNECTED",
        lastSyncError: null,
      },
      create: {
        userId: session.userId,
        name: "X/Twitter Timeline",
        url: "twitter://timeline",
        type: "TWITTER",
        credentials: authResult.credentials,
        status: "CONNECTED",
      },
    });

    return NextResponse.json({
      success: true,
      username: authResult.profileName,
    });
  } catch (error) {
    console.error("Twitter auth error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
