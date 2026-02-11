import { google } from "googleapis";
import type { PrivateSource } from "@prisma/client";
import type {
  SourceConnector,
  AuthResult,
  ConnectionStatus,
  ConnectorItem,
  SyncProgress,
} from "../types";
import { decrypt } from "@/lib/encryption";
import { refreshAccessToken } from "./oauth";
import { fetchMessages } from "./client";

interface GmailCredentials {
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
}

interface GmailConfig {
  senders?: Array<{ email: string; name: string }>;
  lastSyncMessageId?: string;
}

function parseCredentials(source: PrivateSource): GmailCredentials {
  if (!source.credentials) {
    throw new Error("No credentials found");
  }
  return JSON.parse(decrypt(source.credentials));
}

function getGmailAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

export class GmailConnector implements SourceConnector {
  type = "GMAIL" as const;
  onProgress?: (progress: SyncProgress) => void;

  async authenticate(credentials: unknown): Promise<AuthResult> {
    try {
      const creds = credentials as GmailCredentials;
      if (!creds?.refreshToken) {
        return { success: false, error: "Missing refresh token" };
      }

      const accessToken = await refreshAccessToken(creds.refreshToken);
      const auth = getGmailAuth(accessToken);
      const gmail = google.gmail({ version: "v1", auth });

      const profile = await gmail.users.getProfile({ userId: "me" });
      const email = profile.data.emailAddress;

      if (!email) {
        return { success: false, error: "Could not retrieve profile" };
      }

      return {
        success: true,
        profileName: email,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      return { success: false, error: message };
    }
  }

  async fetchItems(source: PrivateSource): Promise<ConnectorItem[]> {
    const creds = parseCredentials(source);
    const accessToken = await refreshAccessToken(creds.refreshToken);
    const gmailConfig = (source.config as unknown as GmailConfig) || {};

    const senders = gmailConfig.senders || [];
    if (senders.length === 0) {
      return [];
    }

    const fromQuery = senders.map((s) => `from:${s.email}`).join(" OR ");
    const query = gmailConfig.lastSyncMessageId
      ? `(${fromQuery}) newer_than:7d`
      : `(${fromQuery}) newer_than:30d`;

    this.onProgress?.({
      phase: "senders",
      current: 0,
      total: senders.length,
    });

    const messages = await fetchMessages(accessToken, query, 50);

    this.onProgress?.({
      phase: "messages",
      current: 0,
      total: messages.length,
    });

    const lastId = gmailConfig.lastSyncMessageId;
    const newMessages = lastId
      ? messages.filter((m) => m.id > lastId)
      : messages;

    return newMessages.map((msg, i) => {
      this.onProgress?.({
        phase: "processing",
        current: i + 1,
        total: newMessages.length,
        currentLabel: `${msg.from} - "${msg.subject}"`,
      });

      return {
        externalId: msg.id,
        title: msg.subject,
        content: msg.body || msg.snippet,
        url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
        author: msg.from,
        publishedAt: msg.date,
      };
    });
  }

  validateConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") return false;
    const cfg = config as Record<string, unknown>;

    // senders is optional but if present must be an array
    if (cfg.senders !== undefined) {
      if (!Array.isArray(cfg.senders)) return false;
      for (const s of cfg.senders) {
        if (
          typeof s !== "object" ||
          !s ||
          typeof (s as Record<string, unknown>).email !== "string"
        ) {
          return false;
        }
      }
    }

    return true;
  }

  async getConnectionStatus(source: PrivateSource): Promise<ConnectionStatus> {
    if (!source.credentials) {
      return { status: "DISCONNECTED" };
    }

    try {
      const creds = parseCredentials(source);
      const accessToken = await refreshAccessToken(creds.refreshToken);
      const auth = getGmailAuth(accessToken);
      const gmail = google.gmail({ version: "v1", auth });

      const profile = await gmail.users.getProfile({ userId: "me" });

      return {
        status: source.status,
        profileName: profile.data.emailAddress || undefined,
        lastSyncAt: source.lastScrapedAt || undefined,
        itemCount: undefined, // article count comes from DB, not here
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection check failed";

      // Token expired → EXPIRED status
      if (
        message.includes("invalid_grant") ||
        message.includes("Token has been expired")
      ) {
        return { status: "EXPIRED", error: message };
      }

      return { status: "ERROR", error: message };
    }
  }

  async disconnect(source: PrivateSource): Promise<void> {
    if (!source.credentials) return;

    try {
      const creds = parseCredentials(source);
      const accessToken = await refreshAccessToken(creds.refreshToken);

      // Revoke the token at Google
      await google.oauth2("v2").tokeninfo({ access_token: accessToken });
      const auth = getGmailAuth(accessToken);
      await auth.revokeToken(accessToken);
    } catch {
      // Best-effort revocation — if it fails, we still clean up locally
    }
  }
}
