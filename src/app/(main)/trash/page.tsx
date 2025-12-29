"use client";

import { useState, useEffect } from "react";
import { ArticleList } from "@/components/articles/ArticleList";
import { SummaryModal } from "@/components/summary/SummaryModal";
import { useUIStore } from "@/stores/uiStore";
import type { Article } from "@/components/articles/ArticleCard";

export default function TrashPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isSummaryModalOpen,
    selectedArticleId,
    openSummaryModal,
    closeSummaryModal,
  } = useUIStore();

  useEffect(() => {
    fetch("/api/trash")
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

      if (!response.ok) throw new Error("Blad");

      const { saved } = await response.json();

      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, isSaved: saved } : a))
      );
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

  const restoreArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/dismiss`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Blad");

      // Remove from trash list
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch (err) {
      console.error("Restore article error:", err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Kosz</h1>
          <p className="text-sm text-muted">
            Artykuly oznaczone jako "nie interesuje mnie"
          </p>
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <h3 className="text-lg font-semibold text-primary mb-2">
              Kosz jest pusty
            </h3>
            <p className="text-muted text-sm max-w-xs mx-auto">
              Artykuly ktore odrzucisz pojawia sie tutaj.
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
          onDismiss={restoreArticle}
          showRestoreButton={true}
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
