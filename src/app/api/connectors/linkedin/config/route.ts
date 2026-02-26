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
    const { profiles, maxPostsPerProfile } = body;

    const config = {
      profiles: profiles || [],
      maxPostsPerProfile: maxPostsPerProfile ?? 10,
    };

    const connector = await getConnector("LINKEDIN");
    if (!connector.validateConfig(config)) {
      return NextResponse.json(
        { error: "Nieprawidłowa konfiguracja" },
        { status: 400 }
      );
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

    await prisma.privateSource.update({
      where: { id: source.id },
      data: { config: config as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LinkedIn config error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
