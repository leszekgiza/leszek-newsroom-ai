"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { SummaryModal } from "@/components/summary/SummaryModal";
import { useUIStore } from "@/stores/uiStore";

interface EditionArticle {
  id: string;
  title: string;
  intro: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  source: string;
  sourceLogoUrl: string | null;
  isRead: boolean;
  isSaved: boolean;
}

interface Edition {
  id: string;
  date: string;
  title: string | null;
  summary: string | null;
  articleCount: number;
  unreadCount: number;
  articles: EditionArticle[];
}

export default function EditionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isSummaryModalOpen,
    selectedArticleId,
    openSummaryModal,
    closeSummaryModal,
  } = useUIStore();

  useEffect(() => {
    async function fetchEdition() {
      try {
        const response = await fetch(`/api/editions/${id}`);
        if (response.ok) {
          const data = await response.json();
          setEdition(data);
        }
      } catch (error) {
        console.error("Error fetching edition:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEdition();
  }, [id]);

  const toggleSave = async (articleId: string) => {
    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });

      if (response.ok) {
        const { saved } = await response.json();
        setEdition((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            articles: prev.articles.map((a) =>
              a.id === articleId ? { ...a, isSaved: saved } : a
            ),
          };
        });
      }
    } catch (error) {
      console.error("Toggle save error:", error);
    }
  };

  const markAsRead = async (articleId: string) => {
    try {
      await fetch(`/api/articles/${articleId}/read`, { method: "POST" });
      setEdition((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          articles: prev.articles.map((a) =>
            a.id === articleId ? { ...a, isRead: true } : a
          ),
        };
      });
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["niedziela", "poniedzialek", "wtorek", "sroda", "czwartek", "piatek", "sobota"];
    const months = [
      "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
      "lipca", "sierpnia", "wrzesnia", "pazdziernika", "listopada", "grudnia"
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Transform edition articles to match ArticleCard format
  const transformedArticles = edition?.articles.map((a) => ({
    id: a.id,
    url: a.url,
    title: a.title,
    intro: a.intro,
    summary: null,
    imageUrl: a.imageUrl,
    author: null,
    publishedAt: a.publishedAt,
    createdAt: a.publishedAt || new Date().toISOString(),
    source: {
      id: a.source,
      name: a.source,
      logoUrl: a.sourceLogoUrl,
    },
    isRead: a.isRead,
    isSaved: a.isSaved,
  })) || [];

  return (
    <>
      <DesktopHeader />

      <div className="p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/editions"
            className="inline-flex items-center gap-2 text-muted hover:text-primary mb-6 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Wszystkie wydania
          </Link>

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-8 bg-border rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-border rounded w-1/3 animate-pulse" />
              <div className="h-20 bg-border rounded animate-pulse mt-6" />
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-4 animate-pulse"
                >
                  <div className="h-5 bg-border rounded w-3/4 mb-2" />
                  <div className="h-4 bg-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : !edition ? (
            <div className="text-center py-12">
              <p className="text-muted text-lg">Wydanie nie zostalo znalezione</p>
              <Link
                href="/editions"
                className="text-accent hover:underline mt-2 inline-block"
              >
                Wroc do listy wydan
              </Link>
            </div>
          ) : (
            <>
              {/* Edition header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-primary mb-2">
                  {edition.title || formatDate(edition.date)}
                </h1>
                <p className="text-muted">
                  {formatDate(edition.date)} &middot; {edition.articleCount} artykulow
                  {edition.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-accent text-white text-xs font-medium rounded-full">
                      {edition.unreadCount} nieprzeczytanych
                    </span>
                  )}
                </p>

                {edition.summary && (
                  <div className="mt-4 p-4 bg-card border border-border rounded-xl">
                    <h3 className="text-sm font-medium text-muted mb-2">Podsumowanie AI</h3>
                    <p className="text-primary">{edition.summary}</p>
                  </div>
                )}
              </div>

              {/* Articles list */}
              <div className="space-y-4">
                {transformedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onOpenSummary={openSummaryModal}
                    onToggleSave={toggleSave}
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <SummaryModal
        articleId={selectedArticleId}
        isOpen={isSummaryModalOpen}
        onClose={closeSummaryModal}
        onToggleSave={toggleSave}
      />
    </>
  );
}
