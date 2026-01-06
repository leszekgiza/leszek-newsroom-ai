"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/playerStore";

export interface Article {
  id: string;
  url: string;
  title: string;
  intro: string | null;
  summary: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  createdAt: string;
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
  onDismiss?: (articleId: string) => void;
  showRestoreButton?: boolean;
}

export function ArticleCard({
  article,
  onOpenSummary,
  onToggleSave,
  onMarkAsRead,
  onDismiss,
  showRestoreButton = false,
}: ArticleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { isPlaying, currentArticleId, voice, play, pause, stop } = usePlayerStore();
  const isCurrentArticle = currentArticleId === article.id;
  const isActivelyPlaying = isPlaying && isCurrentArticle;

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

  const handleDismissClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(article.id);
  };

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!article.isRead) {
      onMarkAsRead(article.id);
    }
    window.open(article.url, "_blank", "noopener,noreferrer");
  };

  const handleTTS = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If already playing this article, pause it
    if (isActivelyPlaying) {
      pause();
      audioRef.current?.pause();
      return;
    }

    // If we have audio for this article, resume it
    if (isCurrentArticle && audioUrl) {
      play(article.id);
      audioRef.current?.play();
      return;
    }

    // Stop any other playing audio
    stop();

    // Get text to read - prefer Polish summary, fallback to intro, then title
    const textToRead = article.summary || article.intro || article.title;
    if (!textToRead) return;

    setIsLoadingTTS(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead, voice }),
      });

      if (!response.ok) {
        throw new Error("TTS failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Cleanup old URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);
      play(article.id);
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setIsLoadingTTS(false);
    }
  };

  // Auto-play when audio URL is set
  const handleAudioCanPlay = () => {
    if (audioRef.current && isCurrentArticle && isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleAudioEnded = () => {
    stop();
  };

  const formatDate = (dateString: string) => {
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

  // Use publishedAt if available, fallback to createdAt
  const displayDate = article.publishedAt || article.createdAt;

  return (
    <article
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="article-card"
      data-article-url={article.url}
      className={cn(
        "bg-card rounded-2xl border border-border p-4 lg:p-5 cursor-pointer transition-all duration-200",
        "card-shadow",
        isHovered && "border-accent/30 lg:border-primary/20"
      )}
    >
      {/* Header: Source + Date + Badge + Save Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Meta info */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {!article.isRead && (
              <Badge variant="new">NEW</Badge>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-surface flex items-center justify-center overflow-hidden flex-shrink-0">
                {article.source.logoUrl ? (
                  <img
                    src={article.source.logoUrl}
                    alt={article.source.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-medium text-muted">
                    {article.source.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">{article.source.name}</span>
            </div>
            <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-muted">
              {formatDate(displayDate)}
            </span>
          </div>

          {/* Title */}
          <h3
            data-testid="article-title"
            className={cn(
              "font-semibold text-primary leading-snug lg:text-lg",
              article.isRead && "text-muted"
            )}
          >
            {article.title}
          </h3>
        </div>

        {/* Action Buttons - Desktop: top right */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Dismiss/Restore Button */}
          {onDismiss && (
            <button
              onClick={handleDismissClick}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                showRestoreButton
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
              title={showRestoreButton ? "Przywroc artykul" : "Nie interesuje mnie"}
            >
              {showRestoreButton ? (
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
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              ) : (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              article.isSaved
                ? "bg-highlight/10 text-highlight"
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-highlight hover:bg-red-50 dark:hover:bg-red-950/20"
            )}
            title={article.isSaved ? "Usun z zapisanych" : "Zapisz na pozniej"}
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
        </div>
      </div>

      {/* Intro (2-sentence AI summary) */}
      {article.intro && (
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-3 lg:mt-4 line-clamp-2 lg:line-clamp-3">
          {article.intro}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 lg:pt-4 mt-3 lg:mt-4 border-t border-border/50">
        <div className="flex gap-2">
          {/* More Button */}
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
          >
            Wiecej
          </button>

          {/* Source Button - Desktop only */}
          <button
            onClick={handleOpenOriginal}
            className="hidden lg:flex px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors items-center gap-1.5"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Zrodlo
          </button>

          {/* Mobile: Save button in actions row */}
          <button
            onClick={handleSaveClick}
            className={cn(
              "lg:hidden p-2 rounded-lg transition-colors",
              article.isSaved
                ? "bg-highlight/10 text-highlight"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-highlight"
            )}
            title={article.isSaved ? "Usun z zapisanych" : "Zapisz"}
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
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile: External link */}
          <button
            onClick={handleOpenOriginal}
            className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
            title="Otworz oryginal"
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

          {/* TTS Button */}
          <button
            onClick={handleTTS}
            disabled={isLoadingTTS}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isActivelyPlaying
                ? "bg-violet-600 text-white"
                : "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40",
              isLoadingTTS && "opacity-50 cursor-wait"
            )}
            title={isActivelyPlaying ? "Zatrzymaj" : "Odczytaj glosowo"}
          >
            {isLoadingTTS ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : isActivelyPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
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
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Hidden audio element for TTS */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onCanPlay={handleAudioCanPlay}
          onEnded={handleAudioEnded}
        />
      )}
    </article>
  );
}
