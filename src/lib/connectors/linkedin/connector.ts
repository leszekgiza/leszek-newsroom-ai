import type { PrivateSource } from "@prisma/client";
import type {
  SourceConnector,
  AuthResult,
  ConnectionStatus,
  ConnectorItem,
  SyncProgress,
} from "../types";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  linkedInAuth,
  linkedInFetchPosts,
  linkedInTest,
  linkedInDisconnect,
} from "./client";

interface LinkedInCredentials {
  email?: string;
  password?: string;
  liAt?: string;
  sessionId?: string;
}

interface LinkedInConfig {
  hashtags?: string[];
  maxPosts?: number;
  includeReposts?: boolean;
}

function parseCredentials(source: PrivateSource): LinkedInCredentials {
  if (!source.credentials) {
    throw new Error("No credentials found");
  }
  return JSON.parse(decrypt(source.credentials));
}

export class LinkedInConnector implements SourceConnector {
  type = "LINKEDIN" as const;
  onProgress?: (progress: SyncProgress) => void;

  async authenticate(credentials: unknown): Promise<AuthResult> {
    try {
      const creds = credentials as LinkedInCredentials;

      const result = await linkedInAuth(
        creds.email,
        creds.password,
        creds.liAt
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Encrypt credentials + sessionId for storage
      const toStore: LinkedInCredentials = {
        email: creds.email,
        password: creds.password,
        liAt: creds.liAt,
        sessionId: result.sessionId,
      };

      return {
        success: true,
        credentials: encrypt(JSON.stringify(toStore)),
        profileName: result.profileName,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      return { success: false, error: message };
    }
  }

  async fetchItems(source: PrivateSource): Promise<ConnectorItem[]> {
    const creds = parseCredentials(source);
    const config = (source.config as unknown as LinkedInConfig) || {};

    // Re-authenticate if no sessionId cached
    let sessionId = creds.sessionId;
    if (!sessionId) {
      const authResult = await linkedInAuth(
        creds.email,
        creds.password,
        creds.liAt
      );
      if (!authResult.success) {
        throw new Error(authResult.error || "Re-authentication failed");
      }
      sessionId = authResult.sessionId;
    }

    this.onProgress?.({
      phase: "senders",
      current: 0,
      total: 1,
      currentLabel: "LinkedIn feed",
    });

    const result = await linkedInFetchPosts(sessionId!, {
      maxPosts: config.maxPosts ?? 30,
      hashtags: config.hashtags,
      includeReposts: config.includeReposts ?? false,
    });

    if (!result.success) {
      throw new Error(result.error || "Fetch failed");
    }

    this.onProgress?.({
      phase: "messages",
      current: 0,
      total: result.posts.length,
    });

    return result.posts.map((post, i) => {
      this.onProgress?.({
        phase: "processing",
        current: i + 1,
        total: result.posts.length,
        currentLabel: `${post.author} - "${post.title?.slice(0, 50)}"`,
      });

      return {
        externalId: post.externalId,
        title: post.title,
        content: post.content,
        url: post.url,
        author: post.author,
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
      };
    });
  }

  validateConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") return false;
    const cfg = config as Record<string, unknown>;

    if (cfg.hashtags !== undefined) {
      if (!Array.isArray(cfg.hashtags)) return false;
      for (const h of cfg.hashtags) {
        if (typeof h !== "string") return false;
      }
    }

    if (cfg.maxPosts !== undefined) {
      if (typeof cfg.maxPosts !== "number" || cfg.maxPosts < 1 || cfg.maxPosts > 100) {
        return false;
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

      if (!creds.sessionId) {
        // Try re-auth
        const authResult = await linkedInAuth(
          creds.email,
          creds.password,
          creds.liAt
        );
        if (!authResult.success) {
          return { status: "EXPIRED", error: authResult.error };
        }
        return {
          status: source.status,
          profileName: authResult.profileName,
          lastSyncAt: source.lastScrapedAt || undefined,
        };
      }

      const testResult = await linkedInTest(creds.sessionId);
      if (!testResult.success) {
        return { status: "EXPIRED", error: testResult.error };
      }

      return {
        status: source.status,
        profileName: testResult.profileName,
        lastSyncAt: source.lastScrapedAt || undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection check failed";
      return { status: "ERROR", error: message };
    }
  }

  async disconnect(source: PrivateSource): Promise<void> {
    if (!source.credentials) return;

    try {
      const creds = parseCredentials(source);
      if (creds.sessionId) {
        await linkedInDisconnect(creds.sessionId);
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
