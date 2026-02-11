import type { PrivateSourceType, ConnectorStatus, PrivateSource } from "@prisma/client";

// === Auth ===

export interface AuthResult {
  success: boolean;
  credentials?: string; // encrypted JSON
  profileName?: string; // e.g. user's email or display name
  error?: string;
}

// === Connection Status ===

export interface ConnectionStatus {
  status: ConnectorStatus;
  profileName?: string;
  lastSyncAt?: Date;
  itemCount?: number;
  error?: string;
}

// === Sync ===

export interface SyncProgress {
  phase: "senders" | "messages" | "processing";
  current: number;
  total: number;
  currentLabel?: string; // e.g. "The Batch - What's new in ML this week"
}

export interface ConnectorItem {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt?: Date;
}

export interface SyncResult {
  items: ConnectorItem[];
  lastSyncToken?: string;
  error?: string;
}

// === Main interface (LLD section 11) ===

export interface SourceConnector {
  type: PrivateSourceType;

  /** Verify credentials and return auth result with profile info */
  authenticate(credentials: unknown): Promise<AuthResult>;

  /** Fetch new items from the source */
  fetchItems(source: PrivateSource): Promise<ConnectorItem[]>;

  /** Validate connector-specific config before saving */
  validateConfig(config: unknown): boolean;

  /** Check current connection health and stats */
  getConnectionStatus(source: PrivateSource): Promise<ConnectionStatus>;

  /** Disconnect: revoke tokens, clean up */
  disconnect(source: PrivateSource): Promise<void>;

  /** Optional progress callback during sync */
  onProgress?: (progress: SyncProgress) => void;
}
