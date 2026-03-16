import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encryption";
import { exchangeCodeForTokens } from "@/lib/connectors/gmail/oauth";

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?gmail=error&reason=${error}`, baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?gmail=error&reason=missing_params", baseUrl)
      );
    }

    // Decrypt userId from state
    let userId: string;
    try {
      userId = decrypt(state);
    } catch {
      return NextResponse.redirect(
        new URL("/settings/integrations?gmail=error&reason=invalid_state", baseUrl)
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.redirect(
        new URL("/settings/integrations?gmail=error&reason=user_not_found", baseUrl)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?gmail=error&reason=no_refresh_token",
          baseUrl
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
      new URL("/settings/integrations/gmail?gmail=connected", baseUrl)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?gmail=error&reason=server_error", baseUrl)
    );
  }
}
