"use client";

import { cn } from "@/lib/utils";

export interface EditionTab {
  date: string; // YYYY-MM-DD
  label: string; // "Dzisiaj", "Wczoraj", "28 gru"
  count: number; // liczba artykułów
  unreadCount: number; // liczba nieprzeczytanych
}

interface EditionTabsProps {
  editions: EditionTab[];
  activeDate: string | null; // null = wszystkie daty
  onDateChange: (date: string | null) => void;
}

export function EditionTabs({
  editions,
  activeDate,
  onDateChange,
}: EditionTabsProps) {
  // Oblicz łączną liczbę artykułów dla "Wszystkie"
  const totalCount = editions.reduce((sum, ed) => sum + ed.count, 0);
  const totalUnread = editions.reduce((sum, ed) => sum + ed.unreadCount, 0);

  return (
    <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border bg-card/50">
      {/* Zakładka "Wszystkie" */}
      <button
        onClick={() => onDateChange(null)}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1.5",
          activeDate === null
            ? "bg-primary text-card"
            : "bg-surface text-muted hover:bg-border/50"
        )}
      >
        Wszystkie
        <span
          className={cn(
            "px-1.5 py-0.5 rounded-full text-xs",
            activeDate === null ? "bg-white/20" : "bg-border"
          )}
        >
          {totalCount}
        </span>
      </button>

      {/* Zakładki z datami */}
      {editions.map((edition) => {
        const isActive = edition.date === activeDate;

        return (
          <button
            key={edition.date}
            onClick={() => onDateChange(edition.date)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1.5",
              isActive
                ? "bg-primary text-card"
                : "bg-surface text-muted hover:bg-border/50"
            )}
          >
            {edition.label}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                isActive ? "bg-white/20" : "bg-border"
              )}
            >
              {edition.count}
            </span>
            {/* Badge nieprzeczytanych */}
            {edition.unreadCount > 0 && !isActive && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-accent text-white">
                {edition.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Helper: formatuje datę na czytelny label
 */
export function formatEditionLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Normalizuj daty do porównania (bez czasu)
  const dateOnly = dateStr.split("T")[0];
  const todayOnly = today.toISOString().split("T")[0];
  const yesterdayOnly = yesterday.toISOString().split("T")[0];

  if (dateOnly === todayOnly) {
    return "Dzisiaj";
  }
  if (dateOnly === yesterdayOnly) {
    return "Wczoraj";
  }

  // Format: "28 gru"
  const day = date.getDate();
  const monthNames = [
    "sty", "lut", "mar", "kwi", "maj", "cze",
    "lip", "sie", "wrz", "paź", "lis", "gru",
  ];
  const month = monthNames[date.getMonth()];

  return `${day} ${month}`;
}

/**
 * Helper: zwraca datę artykułu w formacie YYYY-MM-DD
 */
export function getArticleDate(article: {
  publishedAt?: string | Date | null;
  scrapedAt?: string | Date | null;
  createdAt?: string | Date | null;
}): string {
  const dateValue = article.publishedAt || article.scrapedAt || article.createdAt;
  if (!dateValue) {
    return new Date().toISOString().split("T")[0];
  }
  const date = new Date(dateValue);
  return date.toISOString().split("T")[0];
}
