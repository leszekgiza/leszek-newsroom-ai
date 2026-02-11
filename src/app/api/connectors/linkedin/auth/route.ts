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
    const { email, password, liAt, disclaimerAccepted } = body;

    if (!disclaimerAccepted) {
      return NextResponse.json(
        { error: "Musisz zaakceptować disclaimer" },
        { status: 400 }
      );
    }

    if (!email && !password && !liAt) {
      return NextResponse.json(
        { error: "Podaj email+hasło lub cookie li_at" },
        { status: 400 }
      );
    }

    const connector = await getConnector("LINKEDIN");
    const authResult = await connector.authenticate({ email, password, liAt });

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Autoryzacja nie powiodła się" },
        { status: 400 }
      );
    }

    // Upsert PrivateSource
    await prisma.privateSource.upsert({
      where: {
        userId_url: {
          userId: session.userId,
          url: "linkedin://feed",
        },
      },
      update: {
        credentials: authResult.credentials,
        status: "CONNECTED",
        lastSyncError: null,
      },
      create: {
        userId: session.userId,
        name: "LinkedIn Feed",
        url: "linkedin://feed",
        type: "LINKEDIN",
        credentials: authResult.credentials,
        status: "CONNECTED",
      },
    });

    return NextResponse.json({
      success: true,
      profileName: authResult.profileName,
    });
  } catch (error) {
    console.error("LinkedIn auth error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
