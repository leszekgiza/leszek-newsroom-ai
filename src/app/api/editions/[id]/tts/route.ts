import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EdgeTTS } from "edge-tts-universal";

// Edge TTS voices - must match those in /api/user/preferences
const VALID_VOICES = [
  "pl-PL-MarekNeural",
  "pl-PL-ZofiaNeural",
  "en-US-GuyNeural",
  "en-US-JennyNeural",
] as const;

type Voice = (typeof VALID_VOICES)[number];

function isValidVoice(voice: string): voice is Voice {
  return VALID_VOICES.includes(voice as Voice);
}

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

  return sections.join("

");
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
    
    // Get user voice preference
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { ttsVoice: true },
    });
    
    const voice = user?.ttsVoice || "pl-PL-MarekNeural";

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

    const selectedVoice = isValidVoice(voice) ? voice : "pl-PL-MarekNeural";
    const tts = new EdgeTTS(ttsText, selectedVoice);
    const result = await tts.synthesize();
    const arrayBuffer = await result.audio.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[API] Error generating edition TTS:", error);
    return NextResponse.json({ error: "Nie udalo sie wygenerowac audio" }, { status: 500 });
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
