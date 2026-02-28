"use client";

import { useAuthStore } from "@/stores/authStore";

export interface HeroGreetingProps {
  newCount: number;
  lastSyncAt: string | null;
  onSync: () => void;
  isSyncing: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Dzien dobry";
  if (hour < 18) return "Czesc";
  return "Dobry wieczor";
}

function formatSyncTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeroGreeting({ newCount, lastSyncAt, onSync, isSyncing }: HeroGreetingProps) {
  const { user } = useAuthStore();
  const firstName = user?.name ? user.name.split(" ")[0] : "tam";
  const greeting = getGreeting();

  return (
    <div className="px-4 pt-6 pb-2 lg:px-0">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-semibold text-primary">
            {greeting}, {firstName}!
          </h2>
          <p className="text-sm text-muted mt-1">
            {newCount > 0
              ? <>Masz <strong>{newCount} nowych</strong> artykulow</>
              : "Brak nowych artykulow"}
            {lastSyncAt && (
              <> &middot; Ostatnia synchronizacja {formatSyncTime(lastSyncAt)}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold"
        >
          <svg
            className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isSyncing ? "Pobieram..." : "Pobierz nowe"}
        </button>
      </div>
    </div>
  );
}
