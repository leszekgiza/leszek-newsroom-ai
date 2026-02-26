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
  linkedInFetchProfilePosts,
  linkedInTest,
  linkedInDisconnect,
} from "./client";

interface LinkedInCredentials {
  email?: string;
  password?: string;
  liAt?: string;
  jsessionid?: string;
  sessionId?: string;
}

interface LinkedInProfileConfig {
  publicId: string;
  name: string;
  headline?: string;
  profileUrl: string;
}

interface LinkedInConfig {
  profiles?: LinkedInProfileConfig[];
  maxPostsPerProfile?: number;
  // Legacy fields (backward compat)
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
        creds.liAt,
        creds.jsessionid
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Encrypt credentials + sessionId for storage
      const toStore: LinkedInCredentials = {
        email: creds.email,
        password: creds.password,
        liAt: creds.liAt,
        jsessionid: creds.jsessionid,
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

    const profiles = config.profiles || [];
    console.log("[LINKEDIN] Config:", JSON.stringify(config));
    console.log("[LINKEDIN] Profiles count:", profiles.length);
    if (profiles.length === 0) {
      console.log("[LINKEDIN] No profiles configured, returning empty");
      return [];
    }

    // Re-authenticate if no sessionId cached
    let sessionId = creds.sessionId;
    if (!sessionId) {
      const authResult = await linkedInAuth(
        creds.email,
        creds.password,
        creds.liAt,
        creds.jsessionid
      );
      if (!authResult.success) {
        throw new Error(authResult.error || "Re-authentication failed");
      }
      sessionId = authResult.sessionId;
    }

    const maxPostsPerProfile = config.maxPostsPerProfile ?? 10;
    const allItems: ConnectorItem[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];

      this.onProgress?.({
        phase: "senders",
        current: i + 1,
        total: profiles.length,
        currentLabel: profile.name,
      });

      console.log(`[LINKEDIN] Fetching posts for profile: ${profile.publicId}`);
      const result = await linkedInFetchProfilePosts(
        sessionId!,
        profile.publicId,
        maxPostsPerProfile
      );

      console.log(`[LINKEDIN] Result for ${profile.publicId}: success=${result.success}, posts=${result.posts.length}, error=${result.error}`);
      if (!result.success) {
        console.log(`[LINKEDIN] Failed for ${profile.publicId}: ${result.error}`);
        continue;
      }

      for (const post of result.posts) {
        if (seenIds.has(post.externalId)) continue;
        seenIds.add(post.externalId);

        allItems.push({
          externalId: post.externalId,
          title: post.title,
          content: post.content,
          url: post.url,
          author: post.author || profile.name,
          publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
        });
      }
    }

    this.onProgress?.({
      phase: "processing",
      current: allItems.length,
      total: allItems.length,
      currentLabel: `${allItems.length} postów z ${profiles.length} profili`,
    });

    return allItems;
  }

  validateConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") return false;
    const cfg = config as Record<string, unknown>;

    if (cfg.profiles !== undefined) {
      if (!Array.isArray(cfg.profiles)) return false;
      for (const p of cfg.profiles) {
        if (!p || typeof p !== "object") return false;
        const profile = p as Record<string, unknown>;
        if (typeof profile.publicId !== "string" || !profile.publicId) return false;
        if (typeof profile.name !== "string" || !profile.name) return false;
      }
    }

    if (cfg.maxPostsPerProfile !== undefined) {
      if (
        typeof cfg.maxPostsPerProfile !== "number" ||
        cfg.maxPostsPerProfile < 1 ||
        cfg.maxPostsPerProfile > 50
      ) {
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
          creds.liAt,
          creds.jsessionid
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
