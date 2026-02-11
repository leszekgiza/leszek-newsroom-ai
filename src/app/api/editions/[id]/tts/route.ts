import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTTSProvider } from "@/lib/ai/tts";
import { isValidVoice, DEFAULT_TTS_VOICE } from "@/lib/config";

function generateEditionTTSText(
  articles: Array<{
    title: string;
    intro: string | null;
    catalogSource: { name: string } | null;
    privateSource: { name: string } | null;
    summary?: string | null;
  }>
): string {
  const sections: string[] = [];
  const bySource = new Map<string, typeof articles>();

  for (const article of articles) {
    const sourceName = article.catalogSource?.name || article.privateSource?.name || "Nieznane zrodlo";
    if (!bySource.has(sourceName)) {
      bySource.set(sourceName, []);
    }
    bySource.get(sourceName)!.push(article);
  }

  for (const [sourceName, sourceArticles] of bySource) {
    sections.push("Zrodlo: " + sourceName + ".");
    for (const article of sourceArticles) {
      sections.push(article.title + ".");
      const content = article.summary || article.intro;
      if (content) sections.push(content);
      sections.push("");
    }
    sections.push("");
  }

  return sections.join("\n\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Use user's preferred voice or default
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { ttsVoice: true },
    });
    const voice = user?.ttsVoice && isValidVoice(user.ttsVoice) ? user.ttsVoice : DEFAULT_TTS_VOICE;

    const edition = await prisma.edition.findFirst({
      where: { id, userId: session.userId },
      include: {
        articles: {
          orderBy: { publishedAt: "desc" },
          select: {
            title: true,
            intro: true,
            summary: true,
            catalogSource: { select: { name: true } },
            privateSource: { select: { name: true } },
          },
        },
      },
    });

    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    if (edition.articles.length === 0) {
      return NextResponse.json({ error: "Brak artykulow w wydaniu" }, { status: 400 });
    }

    const ttsText = generateEditionTTSText(edition.articles);

    if (ttsText.length > 50000) {
      return NextResponse.json({ error: "Wydanie za dlugie (max 50000 znakow)" }, { status: 400 });
    }

    const tts = await getTTSProvider();
    const arrayBuffer = await tts.synthesize(ttsText, voice);

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[API] Error generating edition TTS:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Nie udalo sie wygenerowac audio", details: errorMessage }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const edition = await prisma.edition.findFirst({
      where: { id, userId: session.userId },
      include: {
        articles: {
          orderBy: { publishedAt: "desc" },
          select: {
            title: true,
            intro: true,
            summary: true,
            catalogSource: { select: { name: true } },
            privateSource: { select: { name: true } },
          },
        },
      },
    });

    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    const ttsText = generateEditionTTSText(edition.articles);

    return NextResponse.json({
      text: ttsText,
      characterCount: ttsText.length,
      articleCount: edition.articles.length,
    });
  } catch (error) {
    console.error("[API] Error getting edition TTS text:", error);
    return NextResponse.json({ error: "Failed to get TTS text" }, { status: 500 });
  }
}
