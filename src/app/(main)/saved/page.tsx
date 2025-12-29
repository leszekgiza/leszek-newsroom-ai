"use client";

import { useState, useEffect } from "react";
import { ArticleList } from "@/components/articles/ArticleList";
import { SummaryModal } from "@/components/summary/SummaryModal";
import { useUIStore } from "@/stores/uiStore";
import type { Article } from "@/components/articles/ArticleCard";

export default function SavedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isSummaryModalOpen,
    selectedArticleId,
    openSummaryModal,
    closeSummaryModal,
  } = useUIStore();

  useEffect(() => {
    fetch("/api/saved")
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const toggleSave = async (articleId: string) => {
    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });

      if (!response.ok) throw new Error("Błąd");

      const { saved } = await response.json();

      if (!saved) {
        // Remove from list if unsaved
        setArticles((prev) => prev.filter((a) => a.id !== articleId));
      }
    } catch (err) {
      console.error("Toggle save error:", err);
    }
  };

  const markAsRead = async (articleId: string) => {
    try {
      await fetch(`/api/articles/${articleId}/read`, { method: "POST" });
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Zapisane</h1>
        </div>
      </header>

      {articles.length === 0 && !isLoading ? (
        <div className="p-4">
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-muted mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-primary mb-2">
              Brak zapisanych artykułów
            </h3>
            <p className="text-muted text-sm max-w-xs mx-auto">
              Zapisuj interesujące artykuły, aby wrócić do nich później.
            </p>
          </div>
        </div>
      ) : (
        <ArticleList
          articles={articles}
          isLoading={isLoading}
          onOpenSummary={openSummaryModal}
          onToggleSave={toggleSave}
          onMarkAsRead={markAsRead}
        />
      )}

      <SummaryModal
        articleId={selectedArticleId}
        isOpen={isSummaryModalOpen}
        onClose={closeSummaryModal}
        onToggleSave={toggleSave}
      />
    </>
  );
}
