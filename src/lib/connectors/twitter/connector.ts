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
  twitterAuth,
  twitterFetchTimeline,
  twitterTest,
  twitterDisconnect,
} from "./client";

interface TwitterCredentials {
  authToken?: string;
  ct0?: string;
  username?: string;
  password?: string;
  sessionId?: string;
}

interface TwitterConfig {
  timelineType?: "following" | "for_you";
  maxTweets?: number;
  includeRetweets?: boolean;
  includeReplies?: boolean;
  expandThreads?: boolean;
}

function parseCredentials(source: PrivateSource): TwitterCredentials {
  if (!source.credentials) {
    throw new Error("No credentials found");
  }
  return JSON.parse(decrypt(source.credentials));
}

export class TwitterConnector implements SourceConnector {
  type = "TWITTER" as const;
  onProgress?: (progress: SyncProgress) => void;

  async authenticate(credentials: unknown): Promise<AuthResult> {
    try {
      const creds = credentials as TwitterCredentials;

      const result = await twitterAuth(
        creds.authToken,
        creds.ct0,
        creds.username,
        creds.password
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const toStore: TwitterCredentials = {
        authToken: creds.authToken,
        ct0: creds.ct0,
        username: creds.username,
        password: creds.password,
        sessionId: result.sessionId,
      };

      return {
        success: true,
        credentials: encrypt(JSON.stringify(toStore)),
        profileName: result.username,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      return { success: false, error: message };
    }
  }

  async fetchItems(source: PrivateSource): Promise<ConnectorItem[]> {
    const creds = parseCredentials(source);
    const config = (source.config as unknown as TwitterConfig) || {};

    // Re-authenticate if no sessionId cached
    let sessionId = creds.sessionId;
    if (!sessionId) {
      const authResult = await twitterAuth(
        creds.authToken,
        creds.ct0,
        creds.username,
        creds.password
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
      currentLabel: "X/Twitter timeline",
    });

    const result = await twitterFetchTimeline(sessionId!, {
      timelineType: config.timelineType ?? "following",
      maxTweets: config.maxTweets ?? 50,
      includeRetweets: config.includeRetweets ?? true,
      includeReplies: config.includeReplies ?? false,
      expandThreads: config.expandThreads ?? true,
    });

    if (!result.success) {
      throw new Error(result.error || "Fetch failed");
    }

    this.onProgress?.({
      phase: "messages",
      current: 0,
      total: result.tweets.length,
    });

    return result.tweets.map((tweet, i) => {
      this.onProgress?.({
        phase: "processing",
        current: i + 1,
        total: result.tweets.length,
        currentLabel: `${tweet.author} - "${tweet.title?.slice(0, 50)}"`,
      });

      return {
        externalId: tweet.externalId,
        title: tweet.title,
        content: tweet.content,
        url: tweet.url,
        author: tweet.author,
        publishedAt: tweet.publishedAt ? new Date(tweet.publishedAt) : undefined,
      };
    });
  }

  validateConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") return false;
    const cfg = config as Record<string, unknown>;

    if (cfg.timelineType !== undefined) {
      if (cfg.timelineType !== "following" && cfg.timelineType !== "for_you") {
        return false;
      }
    }

    if (cfg.maxTweets !== undefined) {
      if (typeof cfg.maxTweets !== "number" || cfg.maxTweets < 1 || cfg.maxTweets > 200) {
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
        const authResult = await twitterAuth(
          creds.authToken,
          creds.ct0,
          creds.username,
          creds.password
        );
        if (!authResult.success) {
          return { status: "EXPIRED", error: authResult.error };
        }
        return {
          status: source.status,
          profileName: authResult.username,
          lastSyncAt: source.lastScrapedAt || undefined,
        };
      }

      const testResult = await twitterTest(creds.sessionId);
      if (!testResult.success) {
        return { status: "EXPIRED", error: testResult.error };
      }

      return {
        status: source.status,
        profileName: testResult.username,
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
        await twitterDisconnect(creds.sessionId);
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
