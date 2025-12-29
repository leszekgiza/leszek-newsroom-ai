"use client";

import { useEffect, useState, useCallback } from "react";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { TTSPlayer } from "./TTSPlayer";
import type { Article } from "@/components/articles/ArticleCard";

interface SummaryModalProps {
  articleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleSave: (articleId: string) => void;
}

// Minimum word count for a "good" summary (1-2 min TTS = ~150-300 words)
const MIN_SUMMARY_WORDS = 100;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function SummaryModal({
  articleId,
  isOpen,
  onClose,
  onToggleSave,
}: SummaryModalProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = useCallback(async (id: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/articles/${id}/summarize`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setArticle((prev) => prev ? { ...prev, summary: data.summary } : null);
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (articleId && isOpen) {
      setIsLoading(true);
      fetch(`/api/articles/${articleId}`)
        .then((res) => res.json())
        .then((data) => {
          setArticle(data.article);
          // Auto-generate if summary is missing or too short
          const summary = data.article?.summary || "";
          if (!summary || countWords(summary) < MIN_SUMMARY_WORDS) {
            generateSummary(articleId);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [articleId, isOpen, generateSummary]);

  const handleOpenOriginal = () => {
    if (article) {
      window.open(article.url, "_blank");
    }
  };

  const handleSave = () => {
    if (article) {
      onToggleSave(article.id);
      setArticle((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : null));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : article ? (
        <>
          <ModalHeader className="pr-12">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center">
                {article.source.logoUrl ? (
                  <img
                    src={article.source.logoUrl}
                    alt={article.source.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-xs font-medium text-muted">
                    {article.source.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted">{article.source.name}</span>
              {article.isSaved && <Badge variant="source">Zapisane</Badge>}
            </div>
            <h2 className="text-lg font-bold text-primary leading-tight">
              {article.title}
            </h2>
            {article.author && (
              <p className="text-sm text-muted mt-1">
                Autor: {article.author}
              </p>
            )}
          </ModalHeader>

          <ModalContent className="max-h-[50vh]">
            {/* Key Insights / Summary */}
            {isGenerating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-accent animate-spin"
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
                  <span className="text-sm font-medium text-accent">
                    Generuję szczegółowe streszczenie...
                  </span>
                </div>
                <p className="text-sm text-muted">
                  Pobieram treść artykułu i tworzę wartościowe podsumowanie z faktami i insightami. To może potrwać kilka sekund.
                </p>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : article.summary ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Streszczenie AI
                  </h3>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
                    {article.summary}
                  </p>
                </div>

                {/* TTS Player */}
                <TTSPlayer
                  text={article.summary}
                  articleId={article.id}
                />

                {/* Regenerate button */}
                <button
                  onClick={() => generateSummary(article.id)}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Wygeneruj ponownie
                </button>
              </div>
            ) : article.intro ? (
              <div>
                <p className="text-sm text-muted leading-relaxed">
                  {article.intro}
                </p>
                <p className="text-sm text-accent mt-4">
                  Pełne streszczenie zostanie wygenerowane...
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-8">
                Brak streszczenia dla tego artykułu.
              </p>
            )}
          </ModalContent>

          <ModalFooter className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleSave}
              className="flex-1"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              {article.isSaved ? "Zapisano" : "Zapisz"}
            </Button>
            <Button onClick={handleOpenOriginal} className="flex-1">
              <svg
                className="w-4 h-4 mr-2"
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
              Czytaj oryginał
            </Button>
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  );
}
