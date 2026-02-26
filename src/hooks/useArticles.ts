"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Article } from "@/components/articles/ArticleCard";
import type { SourceFilterItem } from "@/components/articles/SourceFilter";
import type { EditionTab } from "@/components/articles/EditionTabs";
import { getArticleDate, formatEditionLabel } from "@/components/articles/EditionTabs";

const PAGE_SIZE = 20;

interface UseArticlesOptions {
  sourceId?: string | null;
  search?: string;
  editionDate?: string | null; // YYYY-MM-DD
}

interface UseArticlesResult {
  articles: Article[];
  filteredArticles: Article[]; // Po filtrze editionDate
  sources: SourceFilterItem[];
  editions: EditionTab[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  refetch: () => void;
  loadMore: () => void;
  toggleSave: (articleId: string) => Promise<void>;
  markAsRead: (articleId: string) => Promise<void>;
  dismissArticle: (articleId: string) => Promise<void>;
}

export function useArticles(options: UseArticlesOptions = {}): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<SourceFilterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const offsetRef = useRef(0);

  const fetchArticles = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      offsetRef.current = 0;
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.sourceId) params.set("sourceId", options.sourceId);
      if (options.search) params.set("search", options.search);
      params.set("limit", PAGE_SIZE.toString());
      params.set("offset", offsetRef.current.toString());

      const response = await fetch(`/api/articles?${params}`);

      if (!response.ok) {
        if (response.status === 401) {
          setError("Zaloguj się, aby zobaczyć artykuły");
          setArticles([]);
          return;
        }
        throw new Error("Błąd pobierania artykułów");
      }

      const data = await response.json();
      const newArticles = data.articles || [];

      if (loadMore) {
        setArticles((prev) => [...prev, ...newArticles]);
      } else {
        setArticles(newArticles);

        // Use server-provided source counts if available (covers ALL articles, not just first page)
        if (data.sources && Array.isArray(data.sources)) {
          const allSources: SourceFilterItem[] = [
            { id: null, name: "Wszystkie", count: data.pagination?.total || newArticles.length },
            ...data.sources.map((s: { id: string; name: string; count: number }) => ({
              id: s.id,
              name: s.name,
              count: s.count,
            })),
          ];
          setSources(allSources);
        } else {
          // Fallback: calculate from current page
          const sourceMap = new Map<string, SourceFilterItem>();
          for (const article of newArticles) {
            const srcId = article.source.id;
            const existing = sourceMap.get(srcId);
            if (existing) {
              existing.count++;
            } else {
              sourceMap.set(srcId, { id: srcId, name: article.source.name, count: 1 });
            }
          }
          const allSources: SourceFilterItem[] = [
            { id: null, name: "Wszystkie", count: data.pagination?.total || newArticles.length },
            ...Array.from(sourceMap.values()).sort((a, b) => b.count - a.count),
          ];
          setSources(allSources);
        }
      }

      // Update pagination state
      if (data.pagination) {
        setHasMore(data.pagination.hasMore);
        setTotalCount(data.pagination.total);
        offsetRef.current += newArticles.length;
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [options.sourceId, options.search]);

  // Reset and fetch when filters change
  useEffect(() => {
    fetchArticles(false);
  }, [fetchArticles]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchArticles(true);
    }
  }, [fetchArticles, isLoadingMore, hasMore]);

  const toggleSave = async (articleId: string) => {
    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });

      if (!response.ok) throw new Error("Błąd");

      const { saved } = await response.json();

      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId ? { ...article, isSaved: saved } : article
        )
      );
    } catch (err) {
      console.error("Toggle save error:", err);
    }
  };

  const markAsRead = async (articleId: string) => {
    try {
      await fetch(`/api/articles/${articleId}/read`, { method: "POST" });

      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId ? { ...article, isRead: true } : article
        )
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const dismissArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Błąd");

      // Remove article from local state and update sources count
      setArticles((prev) => {
        const dismissed = prev.find((a) => a.id === articleId);
        const newArticles = prev.filter((article) => article.id !== articleId);

        // Update sources count - match composite IDs
        if (dismissed) {
          // Build the composite ID that matches this article
          const rawSourceId = dismissed.source.id;
          const articleAuthor = dismissed.author;
          const expectedCompositeId = articleAuthor
            ? `private:${rawSourceId}:${encodeURIComponent(articleAuthor)}`
            : null;

          setSources((prevSources) =>
            prevSources.map((source) => {
              if (source.id === null) {
                // "Wszystkie" - decrease total count
                return { ...source, count: source.count - 1 };
              }
              // Match by composite ID, or by raw ID contained in composite ID
              if (
                (expectedCompositeId && source.id === expectedCompositeId) ||
                source.id === `catalog:${rawSourceId}` ||
                source.id === `private:${rawSourceId}:` ||
                source.id === rawSourceId // legacy
              ) {
                return { ...source, count: source.count - 1 };
              }
              return source;
            }).filter((source) => source.id === null || source.count > 0)
          );
        }

        return newArticles;
      });

      // Update total count
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Dismiss article error:", err);
    }
  };

  // Oblicz editions z artykułów
  const editions = useMemo<EditionTab[]>(() => {
    const editionMap = new Map<string, { count: number; unreadCount: number }>();

    for (const article of articles) {
      const date = getArticleDate(article);
      const existing = editionMap.get(date);

      if (existing) {
        existing.count++;
        if (!article.isRead) existing.unreadCount++;
      } else {
        editionMap.set(date, {
          count: 1,
          unreadCount: article.isRead ? 0 : 1,
        });
      }
    }

    // Konwertuj do tablicy i sortuj od najnowszych
    return Array.from(editionMap.entries())
      .map(([date, { count, unreadCount }]) => ({
        date,
        label: formatEditionLabel(date),
        count,
        unreadCount,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [articles]);

  // Filtruj artykuły po dacie edycji
  const filteredArticles = useMemo(() => {
    if (!options.editionDate) return articles;
    return articles.filter((article) => getArticleDate(article) === options.editionDate);
  }, [articles, options.editionDate]);

  return {
    articles,
    filteredArticles,
    sources,
    editions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    refetch: () => fetchArticles(false),
    loadMore,
    toggleSave,
    markAsRead,
    dismissArticle,
  };
}
