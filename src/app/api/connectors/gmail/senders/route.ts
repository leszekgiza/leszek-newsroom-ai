import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface SenderConfig {
  email: string;
  name: string;
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gmailSource = await prisma.privateSource.findFirst({
      where: {
        userId: session.userId,
        type: "GMAIL",
      },
    });

    if (!gmailSource) {
      return NextResponse.json({ senders: [], connected: false });
    }

    const config = (gmailSource.config as Record<string, unknown>) || {};
    const senders = (config.senders as SenderConfig[]) || [];

    return NextResponse.json({ senders, connected: true });
  } catch (error) {
    console.error("Get Gmail senders error:", error);
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

    const body = await request.json();
    const { senders, maxAgeDays, syncInterval } = body as {
      senders: SenderConfig[];
      maxAgeDays?: number;
      syncInterval?: number;
    };

    if (!Array.isArray(senders)) {
      return NextResponse.json(
        { error: "Lista nadawców jest wymagana" },
        { status: 400 }
      );
    }

    const gmailSource = await prisma.privateSource.findFirst({
      where: {
        userId: session.userId,
        type: "GMAIL",
      },
    });

    if (!gmailSource) {
      return NextResponse.json(
        { error: "Gmail nie jest połączony" },
        { status: 400 }
      );
    }

    const existingConfig =
      (gmailSource.config as Record<string, unknown>) || {};

    const updatedConfig = {
      ...existingConfig,
      senders: senders.map((s) => ({ email: s.email, name: s.name })),
      ...(maxAgeDays !== undefined && { maxAgeDays }),
    };

    const updatedSource = await prisma.privateSource.update({
      where: { id: gmailSource.id },
      data: {
        config: updatedConfig as Prisma.InputJsonValue,
        ...(syncInterval !== undefined && { syncInterval }),
      },
    });

    return NextResponse.json({
      senders,
      connector: {
        id: updatedSource.id,
        type: updatedSource.type,
        status: updatedSource.status,
        syncInterval: updatedSource.syncInterval,
      },
    });
  } catch (error) {
    console.error("Update Gmail senders error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
