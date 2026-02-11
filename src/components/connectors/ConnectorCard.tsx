"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConnectorData } from "./useConnectors";
import { ConnectorSyncProgress } from "./ConnectorSyncProgress";

const CONNECTOR_META: Record<
  string,
  { label: string; icon: React.ReactNode; bgClass: string }
> = {
  GMAIL: {
    label: "Gmail",
    bgClass: "bg-white dark:bg-white/95 border border-gray-200",
    icon: (
      <svg className="w-7 h-7" viewBox="52 42 88 66" fill="none">
        <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
        <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
        <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
        <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
        <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
      </svg>
    ),
  },
  LINKEDIN: {
    label: "LinkedIn",
    bgClass: "bg-[#0A66C2]",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  TWITTER: {
    label: "X / Twitter",
    bgClass: "bg-black",
    icon: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
};

function StatusIndicator({ status }: { status: ConnectorData["status"] }) {
  switch (status) {
    case "CONNECTED":
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Połączono
          </span>
        </div>
      );
    case "SYNCING":
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-primary">
            Synchronizacja...
          </span>
        </div>
      );
    case "EXPIRED":
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            Wygasło
          </span>
        </div>
      );
    case "ERROR":
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            Błąd
          </span>
        </div>
      );
    case "DISCONNECTED":
    default:
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
          <span className="text-xs font-medium text-muted-foreground">
            Rozłączony
          </span>
        </div>
      );
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "-";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface ConnectorCardProps {
  connector: ConnectorData;
  onSync: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onRefetch: () => void;
}

export function ConnectorCard({
  connector,
  onSync,
  onDisconnect,
  onRefetch,
}: ConnectorCardProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const meta = CONNECTOR_META[connector.type] || CONNECTOR_META.GMAIL;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(connector.id);
      onRefetch();
    } catch {
      // error handled upstream
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Czy na pewno chcesz rozłączyć tę integrację?")) return;
    await onDisconnect(connector.id);
    onRefetch();
  };

  const handleManage = () => {
    if (connector.type === "GMAIL") {
      router.push("/settings/integrations/gmail");
    }
  };

  const isExpired = connector.status === "EXPIRED";
  const isError = connector.status === "ERROR";
  const isSyncing = connector.status === "SYNCING" || syncing;
  const isDisconnected = connector.status === "DISCONNECTED";

  return (
    <div
      className={`bg-card rounded-2xl shadow-sm border overflow-hidden ${
        isExpired
          ? "border-orange-300 dark:border-orange-700"
          : isError
            ? "border-red-300 dark:border-red-700"
            : "border-border"
      }`}
    >
      {/* Expired banner */}
      {isExpired && (
        <div className="bg-orange-50 dark:bg-orange-950/30 px-4 py-2.5 flex items-center gap-2 border-b border-orange-200 dark:border-orange-800">
          <svg
            className="w-4 h-4 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            Wymaga ponownego połączenia
          </span>
        </div>
      )}

      {/* Error banner */}
      {isError && connector.lastSyncError && (
        <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2.5 flex items-center gap-2 border-b border-red-200 dark:border-red-800">
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-medium text-red-600 dark:text-red-400 truncate">
            {connector.lastSyncError}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 ${meta.bgClass} rounded-xl flex items-center justify-center shadow-sm`}
          >
            {meta.icon}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{meta.label}</p>
            <p className="text-xs text-muted-foreground">{connector.name}</p>
          </div>
          <StatusIndicator status={isSyncing ? "SYNCING" : connector.status} />
        </div>

        {/* Sync progress (when syncing) */}
        {isSyncing && <ConnectorSyncProgress />}

        {/* Stats */}
        {!isDisconnected && (
          <div className="grid grid-cols-3 gap-3 text-center bg-muted/10 rounded-xl p-3">
            <div>
              <p className="text-lg font-bold text-foreground">
                {connector.senderCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Nadawcy</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {connector.articleCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Artykuły</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {timeAgo(connector.lastSyncAt)}
              </p>
              <p className="text-[10px] text-muted-foreground">Temu</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {isExpired && (
          <button
            onClick={handleManage}
            className="w-full py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Połącz ponownie
          </button>
        )}

        {isSyncing && (
          <button className="w-full py-2 text-xs font-medium text-foreground bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
            Anuluj synchronizację
          </button>
        )}

        {(connector.status === "CONNECTED" || isError) && !isSyncing && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                className="flex-1 py-2 text-xs font-medium text-foreground bg-muted/10 rounded-lg border border-border hover:bg-muted/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Synchronizuj teraz
              </button>
              <button
                onClick={handleManage}
                className="flex-1 py-2 text-xs font-medium text-foreground bg-muted/10 rounded-lg border border-border hover:bg-muted/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Zarządzaj
              </button>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full py-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              Rozłącz
            </button>
          </div>
        )}

        {isDisconnected && (
          <button
            onClick={handleManage}
            className="w-full py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:opacity-90 transition-all"
          >
            Połącz
          </button>
        )}
      </div>
    </div>
  );
}
