"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BriefingPlayer } from "@/components/briefing/BriefingPlayer";

interface BriefingData {
  id: string;
  date: string;
  status: string;
  introScript: string | null;
  articleIds: string[];
  top3Ids: string[];
  edition: { id: string; date: string; title: string | null };
}

interface ArticleData {
  id: string;
  title: string;
  intro: string | null;
  summary: string | null;
  catalogSource: { name: string } | null;
  privateSource: { name: string } | null;
}

export default function BriefingPage() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const response = await fetch("/api/briefings/latest");
        if (!response.ok) return;
        const data = await response.json();
        if (!data.briefing) return;

        setBriefing(data.briefing);

        // Fetch articles for the edition
        const editionRes = await fetch(`/api/editions/${data.briefing.edition.id}`);
        if (editionRes.ok) {
          const editionData = await editionRes.json();
          setArticles(editionData.articles || []);
        }
      } catch (error) {
        console.error("[Briefing] Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBriefing();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-muted">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Ładowanie briefingu...</span>
        </div>
      </div>
    );
  }

  if (!briefing || !briefing.introScript) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-primary mb-1">Brak briefingu</h2>
        <p className="text-sm text-muted text-center mb-4">
          Poranny briefing nie został jeszcze wygenerowany.
          Włącz go w ustawieniach, aby otrzymywać go codziennie.
        </p>
        <button
          onClick={() => router.push("/settings/appearance")}
          className="text-sm text-accent hover:underline"
        >
          Przejdź do ustawień
        </button>
      </div>
    );
  }

  // Map article IDs to full article data in briefing order
  const orderedArticles = briefing.articleIds
    .map((id) => articles.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => ({
      id: a!.id,
      title: a!.title,
      intro: a!.intro,
      summary: a!.summary,
      source: a!.catalogSource?.name || a!.privateSource?.name || "Nieznane źródło",
    }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-muted hover:text-primary mb-3 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Powrót
        </button>
        <h1 className="text-xl font-bold text-primary">Poranny briefing</h1>
        <p className="text-sm text-muted mt-1">
          {briefing.edition.title || new Date(briefing.date).toLocaleDateString("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Player */}
      <BriefingPlayer
        introScript={briefing.introScript}
        articles={orderedArticles}
        top3Ids={briefing.top3Ids}
      />

      {/* Intro Script Text (collapsible) */}
      <details className="mt-6 border border-border rounded-lg">
        <summary className="px-4 py-3 text-sm font-medium text-primary cursor-pointer hover:bg-accent/5">
          Pokaż tekst intro
        </summary>
        <div className="px-4 pb-4 text-sm text-muted leading-relaxed whitespace-pre-line">
          {briefing.introScript}
        </div>
      </details>
    </div>
  );
}
