"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number; // px from bottom to trigger
}

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
}: InfiniteScrollProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, hasMore, isLoading, threshold]);

  if (!hasMore) return null;

  return (
    <div ref={observerRef} className="py-8 flex justify-center">
      {isLoading ? (
        <div className="flex items-center gap-3 text-muted">
          <svg
            className="w-5 h-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Ładowanie kolejnych artykułów...</span>
        </div>
      ) : (
        <div className="h-4" /> // Invisible trigger element
      )}
    </div>
  );
}

// Skeleton component for loading states
export function ArticleCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          {/* Source */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-border rounded-full" />
            <div className="h-3 bg-border rounded w-24" />
          </div>
          {/* Title */}
          <div className="h-5 bg-border rounded w-full" />
          <div className="h-5 bg-border rounded w-3/4" />
          {/* Intro */}
          <div className="h-4 bg-border rounded w-full" />
          <div className="h-4 bg-border rounded w-5/6" />
          {/* Footer */}
          <div className="flex items-center gap-4 pt-2">
            <div className="h-3 bg-border rounded w-20" />
            <div className="h-3 bg-border rounded w-16" />
          </div>
        </div>
        {/* Image placeholder */}
        <div className="w-24 h-24 bg-border rounded-lg flex-shrink-0 hidden sm:block" />
      </div>
    </div>
  );
}

// Multiple skeletons for initial loading
export function ArticleListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
