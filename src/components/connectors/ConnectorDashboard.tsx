"use client";

import { useRouter } from "next/navigation";
import { useConnectors, type ConnectorData } from "./useConnectors";

interface IntegrationDef {
  type: "GMAIL" | "LINKEDIN" | "TWITTER";
  label: string;
  description: string;
  href: string;
  available: boolean;
  icon: React.ReactNode;
  bgClass: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: "GMAIL",
    label: "Gmail",
    description: "Importuj newslettery i ważne maile ze skrzynki Gmail",
    href: "/settings/integrations/gmail",
    available: true,
    bgClass: "bg-white dark:bg-white/95 border border-gray-200",
    icon: (
      <svg className="w-8 h-8" viewBox="52 42 88 66" fill="none">
        <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
        <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
        <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
        <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
        <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
      </svg>
    ),
  },
  {
    type: "LINKEDIN",
    label: "LinkedIn",
    description: "Śledź posty i artykuły z Twojego feeda LinkedIn",
    href: "/settings/integrations/linkedin",
    available: true,
    bgClass: "bg-[#0A66C2]",
    icon: (
      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    type: "TWITTER",
    label: "X / Twitter",
    description: "Importuj tweety i wątki z Twojego timeline",
    href: "/settings/integrations/twitter",
    available: true,
    bgClass: "bg-black dark:bg-white/10",
    icon: (
      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

function StatusBadge({ connector }: { connector?: ConnectorData }) {
  if (!connector) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full" />
        Nie połączono
      </span>
    );
  }

  switch (connector.status) {
    case "CONNECTED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Połączono
        </span>
      );
    case "SYNCING":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Synchronizacja
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
          Wygasło
        </span>
      );
    case "ERROR":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          Błąd
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full" />
          Rozłączono
        </span>
      );
  }
}

function ConnectorStats({ connector }: { connector: ConnectorData }) {
  return (
    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
      <span>{connector.senderCount} nadawców</span>
      <span>{connector.articleCount} artykułów</span>
      {connector.lastSyncAt && (
        <span>
          Sync:{" "}
          {new Date(connector.lastSyncAt).toLocaleDateString("pl-PL")}
        </span>
      )}
    </div>
  );
}

export function ConnectorDashboard() {
  const router = useRouter();
  const { connectors, loading } = useConnectors();

  const getConnectorForType = (type: string): ConnectorData | undefined =>
    connectors.find((c) => c.type === type);

  return (
    <div className="py-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Połącz zewnętrzne źródła, żeby automatycznie importować treści jako
        artykuły.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration) => {
          const connector = getConnectorForType(integration.type);
          const isConnected =
            connector &&
            connector.status !== "DISCONNECTED";
          const disabled = !integration.available;

          return (
            <button
              key={integration.type}
              onClick={() => {
                if (!disabled) router.push(integration.href);
              }}
              disabled={disabled}
              className={`text-left rounded-2xl border p-5 transition-all ${
                disabled
                  ? "opacity-50 cursor-not-allowed border-border bg-muted/5"
                  : isConnected
                    ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:shadow-md cursor-pointer"
                    : "border-border hover:border-primary/50 hover:shadow-md cursor-pointer bg-card"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 ${integration.bgClass} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0`}
                >
                  {integration.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">
                      {integration.label}
                    </h3>
                    {disabled ? (
                      <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-full">
                        Wkrótce
                      </span>
                    ) : loading ? (
                      <span className="w-16 h-5 bg-muted/20 rounded-full animate-pulse" />
                    ) : (
                      <StatusBadge connector={connector} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {integration.description}
                  </p>
                  {isConnected && connector && (
                    <ConnectorStats connector={connector} />
                  )}
                </div>
              </div>

              {/* Action hint */}
              {!disabled && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    {isConnected ? "Zarządzaj" : "Konfiguruj"}
                  </span>
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
