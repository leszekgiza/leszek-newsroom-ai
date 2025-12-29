"use client";

import { useState, useEffect, useCallback } from "react";
import type { Article } from "@/components/articles/ArticleCard";
import type { SourceFilterItem } from "@/components/articles/SourceFilter";

interface UseArticlesOptions {
  sourceId?: string | null;
  search?: string;
}

interface UseArticlesResult {
  articles: Article[];
  sources: SourceFilterItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  toggleSave: (articleId: string) => Promise<void>;
  markAsRead: (articleId: string) => Promise<void>;
}

export function useArticles(options: UseArticlesOptions = {}): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<SourceFilterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.sourceId) params.set("sourceId", options.sourceId);
      if (options.search) params.set("search", options.search);

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
      setArticles(data.articles || []);

      // Calculate source filters
      const sourceMap = new Map<string, SourceFilterItem>();

      for (const article of data.articles || []) {
        const sourceId = article.source.id;
        const existing = sourceMap.get(sourceId);

        if (existing) {
          existing.count++;
        } else {
          sourceMap.set(sourceId, {
            id: sourceId,
            name: article.source.name,
            count: 1,
          });
        }
      }

      const allSources: SourceFilterItem[] = [
        { id: null, name: "Wszystkie", count: data.articles?.length || 0 },
        ...Array.from(sourceMap.values()).sort((a, b) => b.count - a.count),
      ];

      setSources(allSources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  }, [options.sourceId, options.search]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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

  return {
    articles,
    sources,
    isLoading,
    error,
    refetch: fetchArticles,
    toggleSave,
    markAsRead,
  };
}
