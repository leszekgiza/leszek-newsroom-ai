"use client";

import { ArticleCard, type Article } from "./ArticleCard";
import { ArticleCardSkeleton } from "@/components/ui/Skeleton";

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  onOpenSummary: (articleId: string) => void;
  onToggleSave: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
}

export function ArticleList({
  articles,
  isLoading,
  onOpenSummary,
  onToggleSave,
  onMarkAsRead,
}: ArticleListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <ArticleCardSkeleton />
        <ArticleCardSkeleton />
        <ArticleCardSkeleton />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
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
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-primary mb-2">
            Brak artykułów
          </h3>
          <p className="text-muted text-sm max-w-xs mx-auto">
            Dodaj źródła w ustawieniach, aby zacząć śledzić najnowsze artykuły.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onOpenSummary={onOpenSummary}
          onToggleSave={onToggleSave}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
}
