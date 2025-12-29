"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface Article {
  id: string;
  url: string;
  title: string;
  intro: string | null;
  summary: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  source: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  isRead: boolean;
  isSaved: boolean;
}

interface ArticleCardProps {
  article: Article;
  onOpenSummary: (articleId: string) => void;
  onToggleSave: (articleId: string) => void;
  onMarkAsRead: (articleId: string) => void;
}

export function ArticleCard({
  article,
  onOpenSummary,
  onToggleSave,
  onMarkAsRead,
}: ArticleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!article.isRead) {
      onMarkAsRead(article.id);
    }
    onOpenSummary(article.id);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave(article.id);
  };

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!article.isRead) {
      onMarkAsRead(article.id);
    }
    window.open(article.url, "_blank");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "przed chwilą";
    if (diffHours < 24) return `${diffHours}h temu`;
    if (diffDays < 7) return `${diffDays}d temu`;
    return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  };

  return (
    <article
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-card rounded-xl border border-border p-4 cursor-pointer transition-all",
        "card-shadow",
        isHovered && "border-accent/30"
      )}
    >
      {/* Header: Source + Date + NEW badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center overflow-hidden">
          {article.source.logoUrl ? (
            <img
              src={article.source.logoUrl}
              alt={article.source.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-muted">
              {article.source.name.charAt(0)}
            </span>
          )}
        </div>
        <span className="text-sm text-muted font-medium">
          {article.source.name}
        </span>
        <span className="text-sm text-muted/60">•</span>
        <span className="text-sm text-muted/60">
          {formatDate(article.publishedAt)}
        </span>
        {!article.isRead && (
          <Badge variant="new" className="ml-auto">
            NEW
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold text-primary mb-2 line-clamp-2",
          article.isRead && "text-muted"
        )}
      >
        {article.title}
      </h3>

      {/* Intro (2-sentence AI summary) */}
      {article.intro && (
        <p className="text-sm text-muted line-clamp-2 mb-3">{article.intro}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleClick}
          className="px-4 py-2 bg-accent/10 text-accent text-sm font-medium rounded-full hover:bg-accent/20 transition-colors"
        >
          Więcej
        </button>

        <button
          onClick={handleSaveClick}
          className={cn(
            "p-2 rounded-full transition-colors",
            article.isSaved
              ? "bg-highlight/10 text-highlight"
              : "bg-surface text-muted hover:text-primary"
          )}
          title={article.isSaved ? "Usuń z zapisanych" : "Zapisz na później"}
        >
          <svg
            className="w-5 h-5"
            fill={article.isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>

        <button
          onClick={handleOpenOriginal}
          className="p-2 rounded-full bg-surface text-muted hover:text-primary transition-colors ml-auto"
          title="Otwórz oryginał"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}
