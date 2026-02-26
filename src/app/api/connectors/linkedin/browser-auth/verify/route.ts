import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import {
  linkedInBrowserLoginVerify,
  linkedInBrowserLoginClose,
} from "@/lib/connectors/linkedin/client";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, code } = body;

    if (!sessionId || !code) {
      return NextResponse.json(
        { error: "Podaj sessionId i kod weryfikacyjny" },
        { status: 400 }
      );
    }

    const result = await linkedInBrowserLoginVerify(sessionId, code);

    if (result.success && result.state === "success" && result.liAt) {
      // Close browser session
      await linkedInBrowserLoginClose(sessionId);

      // Encrypt li_at cookie for storage
      const credentials = encrypt(JSON.stringify({ liAt: result.liAt, jsessionid: result.jsessionid }));

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

    // Still on 2FA (wrong code) or failed
    return NextResponse.json({
      success: false,
      state: result.state,
      error: result.error || "Weryfikacja nie powiodła się",
      screenshot: result.screenshot,
    });
  } catch (error) {
    console.error("LinkedIn browser auth verify error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas weryfikacji" },
      { status: 500 }
    );
  }
}
