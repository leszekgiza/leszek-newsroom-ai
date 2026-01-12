"use client";

import { ArticleCard, type Article } from "./ArticleCard";
import { ArticleCardSkeleton } from "@/components/ui/Skeleton";
import { InfiniteScroll } from "./InfiniteScroll";

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  onOpenSummary: (articleId: string) => void;
  onToggleSave: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
  onDismiss?: (articleId: string) => void;
  showRestoreButton?: boolean;
  // Infinite scroll props
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
}

export function ArticleList({
  articles,
  isLoading,
  onOpenSummary,
  onToggleSave,
  onMarkAsRead,
  onDismiss,
  showRestoreButton = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  totalCount,
}: ArticleListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6">
        <ArticleCardSkeleton />
        <ArticleCardSkeleton />
        <ArticleCardSkeleton />
        <div className="hidden lg:block"><ArticleCardSkeleton /></div>
        <div className="hidden lg:block"><ArticleCardSkeleton /></div>
        <div className="hidden xl:block"><ArticleCardSkeleton /></div>
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
    <div className="p-4 lg:p-0">
      {/* Article count indicator */}
      {totalCount !== undefined && totalCount > 0 && (
        <div className="mb-4 text-sm text-muted">
          Wyświetlono {articles.length} z {totalCount} artykułów
        </div>
      )}

      {/* Articles grid */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onOpenSummary={onOpenSummary}
            onToggleSave={onToggleSave}
            onMarkAsRead={onMarkAsRead}
            onDismiss={onDismiss}
            showRestoreButton={showRestoreButton}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {onLoadMore && (
        <InfiniteScroll
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoading={isLoadingMore}
        />
      )}
    </div>
  );
}
