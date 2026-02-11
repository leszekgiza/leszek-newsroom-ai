import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { refreshAccessToken } from "@/lib/connectors/gmail/oauth";
import { searchSender } from "@/lib/connectors/gmail/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: "Email jest wymagany" },
        { status: 400 }
      );
    }

    // Find user's Gmail source
    const gmailSource = await prisma.privateSource.findFirst({
      where: {
        userId: session.userId,
        type: "GMAIL",
        status: "CONNECTED",
      },
    });

    if (!gmailSource?.credentials) {
      return NextResponse.json(
        { error: "Gmail nie jest połączony" },
        { status: 400 }
      );
    }

    // Decrypt credentials and get fresh access token
    const creds = JSON.parse(decrypt(gmailSource.credentials));
    const accessToken = await refreshAccessToken(creds.refreshToken);

    const senderInfo = await searchSender(accessToken, email);
    return NextResponse.json({
      found: senderInfo.messageCount > 0,
      sender: senderInfo,
      matchQuery: `from:${email} newer_than:30d`,
    });
  } catch (error) {
    console.error("Gmail search sender error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
