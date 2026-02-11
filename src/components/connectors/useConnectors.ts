"use client";

import { useState, useEffect, useCallback } from "react";

export interface ConnectorData {
  id: string;
  name: string;
  type: "GMAIL" | "LINKEDIN" | "TWITTER";
  status: "CONNECTED" | "SYNCING" | "ERROR" | "EXPIRED" | "DISCONNECTED";
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncInterval: number;
  articleCount: number;
  senderCount: number;
}

export interface ConnectorSummary {
  active: number;
  needsAttention: number;
  totalArticles: number;
}

export function useConnectors() {
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);
  const [summary, setSummary] = useState<ConnectorSummary>({
    active: 0,
    needsAttention: 0,
    totalArticles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/connectors");
      if (!res.ok) throw new Error("Failed to fetch connectors");
      const data = await res.json();
      setConnectors(data.connectors);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const syncConnector = useCallback(async (id: string) => {
    const res = await fetch(`/api/connectors/${id}/sync`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Sync failed");
    }
    return res.json();
  }, []);

  const disconnectConnector = useCallback(async (id: string) => {
    const res = await fetch(`/api/connectors/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Disconnect failed");
    }
    return res.json();
  }, []);

  return {
    connectors,
    summary,
    loading,
    error,
    refetch: fetchConnectors,
    syncConnector,
    disconnectConnector,
  };
}
