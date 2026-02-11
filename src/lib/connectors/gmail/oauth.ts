import { OAuth2Client } from "google-auth-library";
import { getConfig } from "@/lib/config";
import { encrypt } from "@/lib/encryption";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getOAuth2Client(): OAuth2Client {
  const config = getConfig();
  return new OAuth2Client(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.gmail.redirectUri
  );
}

/**
 * Generate Google OAuth consent URL.
 * State contains encrypted userId for CSRF-like verification.
 */
export function getGoogleAuthUrl(userId: string): string {
  const client = getOAuth2Client();
  const state = encrypt(userId);

  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return credentials.access_token;
}
