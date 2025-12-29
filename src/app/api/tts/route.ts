import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Edge TTS voices
const VOICES = {
  "pl-PL-MarekNeural": "pl-PL-MarekNeural",
  "pl-PL-ZofiaNeural": "pl-PL-ZofiaNeural",
  "en-US-GuyNeural": "en-US-GuyNeural",
  "en-US-JennyNeural": "en-US-JennyNeural",
} as const;

type VoiceKey = keyof typeof VOICES;

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voice = "pl-PL-MarekNeural" } = await request.json();

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

    const selectedVoice = VOICES[voice as VoiceKey] || VOICES["pl-PL-MarekNeural"];

    // Import edge-tts dynamically
    const edgeTts = await import("edge-tts");
    const audioBuffer = await edgeTts.tts(text, { voice: selectedVoice });

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(audioBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": uint8Array.length.toString(),
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
