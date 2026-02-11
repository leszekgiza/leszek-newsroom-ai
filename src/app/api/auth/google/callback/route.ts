import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encryption";
import { exchangeCodeForTokens } from "@/lib/connectors/gmail/oauth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?gmail=error&reason=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?gmail=error&reason=missing_params", request.url)
      );
    }

    // Decrypt userId from state
    let userId: string;
    try {
      userId = decrypt(state);
    } catch {
      return NextResponse.redirect(
        new URL("/settings/integrations?gmail=error&reason=invalid_state", request.url)
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.redirect(
        new URL("/settings/integrations?gmail=error&reason=user_not_found", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?gmail=error&reason=no_refresh_token",
          request.url
        )
      );
    }

    // Encrypt refresh token for storage
    const encryptedCredentials = encrypt(
      JSON.stringify({
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date,
      })
    );

    // Upsert PrivateSource for Gmail
    await prisma.privateSource.upsert({
      where: {
        userId_url: {
          userId,
          url: "gmail://inbox",
        },
      },
      update: {
        credentials: encryptedCredentials,
        status: "CONNECTED",
        lastSyncError: null,
      },
      create: {
        userId,
        name: "Gmail Newsletters",
        url: "gmail://inbox",
        type: "GMAIL",
        credentials: encryptedCredentials,
        status: "CONNECTED",
      },
    });

    return NextResponse.redirect(
      new URL("/settings/integrations?gmail=connected", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?gmail=error&reason=server_error", request.url)
    );
  }
}
