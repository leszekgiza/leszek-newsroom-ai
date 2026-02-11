import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TTS_VOICES } from "@/lib/config";

// GET - fetch user preferences
export async function GET() {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        theme: true,
        defaultView: true,
        ttsVoice: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      theme: user.theme,
      defaultView: user.defaultView,
      ttsVoice: user.ttsVoice,
      availableVoices: TTS_VOICES,
    });
  } catch (error) {
    console.error("[API] Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PATCH - update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme, defaultView, ttsVoice } = body;

    // Validate values
    const validThemes = ["LIGHT", "DARK", "SYSTEM"];
    const validViews = ["FEED", "EDITIONS"];
    const validVoices = TTS_VOICES.map((v) => v.id);

    const updateData: Record<string, string> = {};

    if (theme !== undefined) {
      if (!validThemes.includes(theme)) {
        return NextResponse.json(
          { error: "Invalid theme value" },
          { status: 400 }
        );
      }
      updateData.theme = theme;
    }

    if (defaultView !== undefined) {
      if (!validViews.includes(defaultView)) {
        return NextResponse.json(
          { error: "Invalid defaultView value" },
          { status: 400 }
        );
      }
      updateData.defaultView = defaultView;
    }

    if (ttsVoice !== undefined) {
      if (!validVoices.includes(ttsVoice)) {
        return NextResponse.json(
          { error: "Invalid ttsVoice value" },
          { status: 400 }
        );
      }
      updateData.ttsVoice = ttsVoice;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        theme: true,
        defaultView: true,
        ttsVoice: true,
      },
    });

    return NextResponse.json({
      theme: user.theme,
      defaultView: user.defaultView,
      ttsVoice: user.ttsVoice,
    });
  } catch (error) {
    console.error("[API] Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
