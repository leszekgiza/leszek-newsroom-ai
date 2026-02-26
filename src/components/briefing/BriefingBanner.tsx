"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BriefingData {
  id: string;
  date: string;
  articleIds: string[];
}

export function BriefingBanner() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const response = await fetch("/api/briefings/latest");
        if (!response.ok) return;
        const data = await response.json();
        if (data.briefing) {
          // Only show if from today
          const briefingDate = new Date(data.briefing.date).toDateString();
          const today = new Date().toDateString();
          if (briefingDate === today) {
            setBriefing(data.briefing);
          }
        }
      } catch {
        // Silently ignore
      }
    }
    fetchBriefing();
  }, []);

  if (!briefing) return null;

  const articleCount = briefing.articleIds.length;
  const estimatedMinutes = Math.max(5, Math.round(articleCount * 1.5 + 2));

  return (
    <Link href="/briefing">
      <div className="mx-4 mt-3 lg:mx-0 bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/25 rounded-xl p-4 flex items-center gap-3 hover:from-accent/20 hover:to-accent/10 transition-colors cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">
            Poranny briefing gotowy
          </p>
          <p className="text-xs text-muted">
            {articleCount} artykułów, ~{estimatedMinutes} min
          </p>
        </div>
        <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
