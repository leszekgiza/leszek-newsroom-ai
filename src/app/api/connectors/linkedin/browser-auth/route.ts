import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { linkedInBrowserLoginStart } from "@/lib/connectors/linkedin/client";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, disclaimerAccepted } = body;

    if (!disclaimerAccepted) {
      return NextResponse.json(
        { error: "Musisz zaakceptować disclaimer" },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Podaj email i hasło" },
        { status: 400 }
      );
    }

    const result = await linkedInBrowserLoginStart(email, password);

    if (result.success && result.state === "success" && result.liAt) {
      // Encrypt li_at cookie for storage
      const credentials = encrypt(
        JSON.stringify({ liAt: result.liAt, jsessionid: result.jsessionid, email })
      );

      await prisma.privateSource.upsert({
        where: {
          userId_url: {
            userId: session.userId,
            url: "linkedin://profiles",
          },
        },
        update: {
          credentials,
          status: "CONNECTED",
          lastSyncError: null,
        },
        create: {
          userId: session.userId,
          name: "LinkedIn Profiles",
          url: "linkedin://profiles",
          type: "LINKEDIN",
          credentials,
          status: "CONNECTED",
        },
      });

      return NextResponse.json({
        success: true,
        profileName: result.profileName,
      });
    }

    // 2FA required
    if (result.state.startsWith("2fa")) {
      return NextResponse.json({
        success: false,
        state: result.state,
        sessionId: result.sessionId,
      });
    }

    // CAPTCHA
    if (result.state === "captcha") {
      return NextResponse.json({
        success: false,
        state: "captcha",
        screenshot: result.screenshot,
        error: result.error || "LinkedIn wymaga CAPTCHA",
      });
    }

    // Failed
    return NextResponse.json(
      {
        success: false,
        state: "failed",
        error: result.error || "Logowanie nie powiodło się",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("LinkedIn browser auth error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas logowania" },
      { status: 500 }
    );
  }
}
