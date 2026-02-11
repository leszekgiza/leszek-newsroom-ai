import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTTSProvider } from "@/lib/ai/tts";
import { isValidVoice, DEFAULT_TTS_VOICE } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voice = DEFAULT_TTS_VOICE } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Tekst jest wymagany" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Tekst jest za długi (max 5000 znaków)" },
        { status: 400 }
      );
    }

    const selectedVoice = isValidVoice(voice) ? voice : DEFAULT_TTS_VOICE;
    const tts = await getTTSProvider();
    const arrayBuffer = await tts.synthesize(text, selectedVoice);

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować audio" },
      { status: 500 }
    );
  }
}
