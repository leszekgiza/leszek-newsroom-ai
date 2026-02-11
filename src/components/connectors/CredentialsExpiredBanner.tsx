"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConnectors, type ConnectorData } from "./useConnectors";

const DISMISS_STORAGE_KEY = "credentials-expired-dismissed";
const DISMISS_HOURS = 24;

interface ConnectorBrandConfig {
  bgClass: string;
  textClass: string;
  btnClass: string;
  dismissClass: string;
  borderClass: string;
  icon: React.ReactNode;
  href: string;
  expiredLabel: string;
}

const BRAND_CONFIG: Record<string, ConnectorBrandConfig> = {
  GMAIL: {
    bgClass: "bg-red-50 dark:bg-red-950/30",
    textClass: "text-red-800 dark:text-red-300",
    btnClass: "bg-red-500 hover:bg-red-600",
    dismissClass: "text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50",
    borderClass: "border-red-200 dark:border-red-800",
    icon: (
      <div className="w-10 h-10 bg-white dark:bg-white/95 border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5" viewBox="52 42 88 66" fill="none">
          <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
          <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
          <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
          <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
          <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
        </svg>
      </div>
    ),
    href: "/settings/integrations/gmail",
    expiredLabel: "Gmail wymaga ponownej autoryzacji",
  },
  LINKEDIN: {
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    textClass: "text-blue-800 dark:text-blue-300",
    btnClass: "bg-[#0A66C2] hover:bg-blue-700",
    dismissClass: "text-blue-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50",
    borderClass: "border-blue-200 dark:border-blue-800",
    icon: (
      <div className="w-10 h-10 bg-[#0A66C2] rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </div>
    ),
    href: "/settings/integrations/linkedin",
    expiredLabel: "LinkedIn: sesja wygasła",
  },
  TWITTER: {
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    textClass: "text-amber-800 dark:text-amber-300",
    btnClass: "bg-amber-500 hover:bg-amber-600",
    dismissClass: "text-amber-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50",
    borderClass: "border-amber-200 dark:border-amber-800",
    icon: (
      <div className="w-10 h-10 bg-black dark:bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    ),
    href: "/settings/integrations/twitter",
    expiredLabel: "X/Twitter wymaga ponownego połączenia",
  },
};

function getSubLabel(type: string): string {
  switch (type) {
    case "GMAIL":
      return "Token OAuth wygasł";
    case "LINKEDIN":
      return "Odśwież cookie li_at lub zaloguj ponownie";
    case "TWITTER":
      return "Cookies wygasły";
    default:
      return "Połączenie wygasło";
  }
}

function isDismissed(type: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) || "{}");
    const ts = data[type];
    if (!ts) return false;
    return Date.now() - ts < DISMISS_HOURS * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function setDismissed(type: string) {
  try {
    const data = JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) || "{}");
    data[type] = Date.now();
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function ExpiredBanner({
  connector,
  onDismiss,
}: {
  connector: ConnectorData;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const brand = BRAND_CONFIG[connector.type];
  if (!brand) return null;

  return (
    <div
      className={`${brand.bgClass} border ${brand.borderClass} rounded-2xl p-3.5 flex items-center gap-3`}
    >
      {brand.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${brand.textClass}`}>
          {brand.expiredLabel}
        </p>
        <p className={`text-xs ${brand.textClass} opacity-75 mt-0.5`}>
          {getSubLabel(connector.type)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => router.push(brand.href)}
          className={`px-3 py-1.5 ${brand.btnClass} text-white text-xs font-medium rounded-lg transition-colors`}
        >
          Połącz
        </button>
        <button
          onClick={onDismiss}
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${brand.dismissClass} transition-colors`}
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function CredentialsExpiredBanner() {
  const { connectors } = useConnectors();
  const [manualDismissed, setManualDismissed] = useState<Set<string>>(new Set());

  const dismissed = useMemo(() => {
    const set = new Set(manualDismissed);
    for (const c of connectors) {
      if (isDismissed(c.type)) set.add(c.type);
    }
    return set;
  }, [connectors, manualDismissed]);

  const expiredConnectors = connectors.filter(
    (c) => c.status === "EXPIRED" && !dismissed.has(c.type)
  );

  if (expiredConnectors.length === 0) return null;

  const handleDismiss = (type: string) => {
    setDismissed(type);
    setManualDismissed((prev) => new Set([...prev, type]));
  };

  return (
    <div className="space-y-2">
      {expiredConnectors.map((connector) => (
        <ExpiredBanner
          key={connector.type}
          connector={connector}
          onDismiss={() => handleDismiss(connector.type)}
        />
      ))}
    </div>
  );
}
