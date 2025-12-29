import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId, subscribe } = await request.json();

    if (!sourceId) {
      return NextResponse.json(
        { error: "ID źródła jest wymagane" },
        { status: 400 }
      );
    }

    // Check if source exists
    const source = await prisma.catalogSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Źródło nie znalezione" },
        { status: 404 }
      );
    }

    if (subscribe) {
      // Subscribe
      await prisma.userSubscription.upsert({
        where: {
          userId_catalogSourceId: {
            userId: session.userId,
            catalogSourceId: sourceId,
          },
        },
        update: {},
        create: {
          userId: session.userId,
          catalogSourceId: sourceId,
        },
      });

      // Remove from hidden if was hidden
      await prisma.hiddenCatalogSource.deleteMany({
        where: {
          userId: session.userId,
          catalogSourceId: sourceId,
        },
      });
    } else {
      // Unsubscribe
      await prisma.userSubscription.deleteMany({
        where: {
          userId: session.userId,
          catalogSourceId: sourceId,
        },
      });
    }

    return NextResponse.json({ success: true, subscribed: subscribe });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
