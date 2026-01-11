"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { cn } from "@/lib/utils";

interface Edition {
  id: string;
  date: string;
  title: string | null;
  summary: string | null;
  articleCount: number;
  unreadCount: number;
}

export default function EditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEditions() {
      try {
        const response = await fetch("/api/editions");
        if (response.ok) {
          const data = await response.json();
          setEditions(data.editions || []);
        }
      } catch (error) {
        console.error("Error fetching editions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEditions();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = dateStr.split("T")[0];
    const todayOnly = today.toISOString().split("T")[0];
    const yesterdayOnly = yesterday.toISOString().split("T")[0];

    if (dateOnly === todayOnly) return "Dzisiaj";
    if (dateOnly === yesterdayOnly) return "Wczoraj";

    const days = ["niedziela", "poniedzialek", "wtorek", "sroda", "czwartek", "piatek", "sobota"];
    const months = [
      "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
      "lipca", "sierpnia", "wrzesnia", "pazdziernika", "listopada", "grudnia"
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  return (
    <>
      <DesktopHeader />

      <div className="p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-primary mb-6">Wydania</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-6 animate-pulse"
                >
                  <div className="h-5 bg-border rounded w-1/3 mb-3" />
                  <div className="h-4 bg-border rounded w-2/3 mb-2" />
                  <div className="h-4 bg-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : editions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-border/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <p className="text-muted text-lg mb-2">Brak wydan</p>
              <p className="text-sm text-muted/70">
                Wydania sa tworzone automatycznie gdy pojawiaja sie nowe artykuly
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {editions.map((edition) => (
                <Link
                  key={edition.id}
                  href={`/editions/${edition.id}`}
                  className="block bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
                          {edition.title || formatDate(edition.date)}
                        </h2>
                        {edition.unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-accent text-white text-xs font-medium rounded-full">
                            {edition.unreadCount} nowych
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted mb-3">
                        {formatDate(edition.date)} &middot; {edition.articleCount} artykulow
                      </p>

                      {edition.summary && (
                        <p className="text-sm text-primary/80 line-clamp-2">
                          {edition.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-muted group-hover:text-primary transition-colors">
                      <svg
                        className="w-5 h-5"
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
