import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    const { disclaimerAccepted, profiles, maxPostsPerProfile } = body;

    if (!disclaimerAccepted) {
      return NextResponse.json(
        { error: "Musisz zaakceptować disclaimer" },
        { status: 400 }
      );
    }

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json(
        { error: "Dodaj przynajmniej jeden profil" },
        { status: 400 }
      );
    }

    const config = {
      profiles,
      maxPostsPerProfile: maxPostsPerProfile ?? 10,
    };

    const connector = await getConnector("LINKEDIN");
    if (!connector.validateConfig(config)) {
      return NextResponse.json(
        { error: "Nieprawidłowa konfiguracja" },
        { status: 400 }
      );
    }

    // Upsert PrivateSource WITHOUT credentials (public mode)
    await prisma.privateSource.upsert({
      where: {
        userId_url: {
          userId: session.userId,
          url: "linkedin://profiles",
        },
      },
      update: {
        credentials: null,
        config: config as Prisma.InputJsonValue,
        status: "CONNECTED",
        lastSyncError: null,
      },
      create: {
        userId: session.userId,
        name: "LinkedIn Profiles",
        url: "linkedin://profiles",
        type: "LINKEDIN",
        credentials: null,
        config: config as Prisma.InputJsonValue,
        status: "CONNECTED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LinkedIn public config error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
