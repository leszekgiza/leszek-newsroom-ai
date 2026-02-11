import { NextResponse } from "next/server";
import { TTS_VOICES } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ voices: TTS_VOICES });
}
