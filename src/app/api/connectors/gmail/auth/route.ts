import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/connectors/gmail/oauth";
import { getConfig } from "@/lib/config";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getConfig();
    if (!config.gmail.clientId || !config.gmail.clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth is not configured" },
        { status: 503 }
      );
    }

    const authUrl = getGoogleAuthUrl(session.userId);
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Gmail auth initiation error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
