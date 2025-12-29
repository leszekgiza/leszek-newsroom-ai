"use client";

import { useUIStore } from "@/stores/uiStore";

export function DesktopHeader() {
  const { searchQuery, setSearchQuery } = useUIStore();

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj w artykulach..."
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 ml-8">
          <button className="p-2 text-muted hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Dodaj zrodlo
          </button>
        </div>
      </div>
    </header>
  );
}
