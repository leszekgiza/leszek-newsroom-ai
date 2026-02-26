"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/stores/playerStore";
import { cn } from "@/lib/utils";

interface BriefingArticle {
  id: string;
  title: string;
  intro: string | null;
  summary: string | null;
  source: string;
}

interface BriefingPlayerProps {
  introScript: string;
  articles: BriefingArticle[];
  top3Ids: string[];
}

export function BriefingPlayer({ introScript, articles, top3Ids }: BriefingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCacheRef = useRef<Map<number, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  // Track -1 = intro, 0..N = article segments (excluding top 3)
  const [currentTrack, setCurrentTrack] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playerStore = usePlayerStore();

  // Segment articles = all articles except top 3 (which are in the intro)
  const segmentArticles = articles.filter((a) => !top3Ids.includes(a.id));
  const totalTracks = 1 + segmentArticles.length; // intro + segments
  const isIntro = currentTrack === -1;

  const currentLabel = isIntro
    ? "Intro — najważniejsze 3 artykuły"
    : segmentArticles[currentTrack]?.title || "";

  const currentSubLabel = isIntro
    ? `${articles.length} artykułów w briefingu`
    : segmentArticles[currentTrack]?.source || "";

  const trackNumber = currentTrack + 2; // -1→1, 0→2, 1→3, etc.

  const getArticleTTSText = useCallback((article: BriefingArticle): string => {
    const content = article.summary || article.intro || "";
    const parts = [`Źródło: ${article.source}.`, article.title + "."];
    if (content) parts.push(content);
    const text = parts.join("\n\n");
    return text.length > 4900 ? text.slice(0, 4897) + "..." : text;
  }, []);

  const generateAudio = useCallback(async (
    trackIdx: number,
    signal?: AbortSignal
  ): Promise<string | null> => {
    const cached = audioCacheRef.current.get(trackIdx);
    if (cached) return cached;

    let text: string;
    if (trackIdx === -1) {
      text = introScript;
    } else {
      const article = segmentArticles[trackIdx];
      if (!article) return null;
      text = getArticleTTSText(article);
    }

    if (!text.trim()) return null;

    const voice = playerStore.voice;
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Nie udało się wygenerować audio");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioCacheRef.current.set(trackIdx, url);
    return url;
  }, [introScript, segmentArticles, getArticleTTSText, playerStore.voice]);

  const prefetchNext = useCallback(async (trackIdx: number) => {
    if (trackIdx >= segmentArticles.length) return;
    if (audioCacheRef.current.has(trackIdx)) return;

    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    try {
      await generateAudio(trackIdx, controller.signal);
    } catch {
      // Silently ignore prefetch errors
    }
  }, [segmentArticles.length, generateAudio]);

  const playTrack = useCallback(async (trackIdx: number) => {
    if (trackIdx < -1 || trackIdx >= segmentArticles.length) return;

    playerStore.stop();
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setCurrentTrack(trackIdx);
    setError(null);
    setProgress(0);
    setDuration(0);

    const cached = audioCacheRef.current.get(trackIdx);
    if (cached) {
      if (audioRef.current) {
        audioRef.current.src = cached;
        audioRef.current.currentTime = 0;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch {
          if (!controller.signal.aborted) setError("Nie udało się odtworzyć audio");
        }
      }
      prefetchNext(trackIdx + 1);
      return;
    }

    setIsLoadingCurrent(true);
    try {
      const url = await generateAudio(trackIdx, controller.signal);
      if (controller.signal.aborted) return;

      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
      }
      prefetchNext(trackIdx + 1);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      if (!controller.signal.aborted) setIsLoadingCurrent(false);
    }
  }, [segmentArticles.length, generateAudio, prefetchNext, playerStore]);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current?.src && audioRef.current.src !== window.location.href) {
      try {
        playerStore.stop();
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setError("Nie udało się wznowić odtwarzania");
      }
      return;
    }

    playTrack(currentTrack);
  }, [isPlaying, currentTrack, playTrack, playerStore]);

  const handleNext = useCallback(() => {
    const maxTrack = segmentArticles.length - 1;
    if (currentTrack < maxTrack) {
      playTrack(currentTrack + 1);
    }
  }, [currentTrack, segmentArticles.length, playTrack]);

  const handlePrev = useCallback(() => {
    if (progress > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
    } else if (currentTrack > -1) {
      playTrack(currentTrack - 1);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
    }
  }, [progress, currentTrack, playTrack]);

  const handleEnded = useCallback(() => {
    const maxTrack = segmentArticles.length - 1;
    if (currentTrack < maxTrack) {
      playTrack(currentTrack + 1);
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  }, [currentTrack, segmentArticles.length, playTrack]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleRetry = () => {
    setError(null);
    const cached = audioCacheRef.current.get(currentTrack);
    if (cached) {
      URL.revokeObjectURL(cached);
      audioCacheRef.current.delete(currentTrack);
    }
    playTrack(currentTrack);
  };

  // Pause when card-level TTS starts
  useEffect(() => {
    if (playerStore.isPlaying && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [playerStore.isPlaying, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    const cache = audioCacheRef.current;
    return () => {
      abortControllerRef.current?.abort();
      prefetchAbortRef.current?.abort();
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
      cache.clear();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4">
      {/* Section indicator */}
      {isIntro && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            INTRO
          </span>
          <span className="text-xs text-muted">Podcast-style — top 3 artykuły</span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Prev button */}
        <button
          onClick={handlePrev}
          disabled={isLoadingCurrent}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            "bg-accent/10 text-accent hover:bg-accent/20",
            isLoadingCurrent && "opacity-30 cursor-not-allowed"
          )}
          title="Poprzedni"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoadingCurrent}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isPlaying
              ? "bg-accent text-white shadow-lg shadow-accent/30"
              : "bg-accent/20 text-accent hover:bg-accent/30",
            isLoadingCurrent && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoadingCurrent ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={isLoadingCurrent || currentTrack >= segmentArticles.length - 1}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            "bg-accent/10 text-accent hover:bg-accent/20",
            (isLoadingCurrent || currentTrack >= segmentArticles.length - 1) && "opacity-30 cursor-not-allowed"
          )}
          title="Następny"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-primary truncate pr-2">
              {currentLabel}
            </span>
            <span className="text-xs text-muted flex-shrink-0">
              {trackNumber}/{totalTracks}
            </span>
          </div>
          <span className="text-xs text-muted truncate block">
            {currentSubLabel}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-muted w-10">{formatTime(progress)}</span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          disabled={!isPlaying && progress === 0}
          className="flex-1 h-1.5 bg-border rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
            disabled:opacity-50 disabled:cursor-default"
        />
        <span className="text-xs text-muted w-10 text-right">
          {duration ? formatTime(duration) : "--:--"}
        </span>
      </div>

      {/* Segment list */}
      {!isIntro && segmentArticles.length > 0 && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <p className="text-xs text-muted mb-2">Segmenty</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {segmentArticles.map((article, idx) => (
              <button
                key={article.id}
                onClick={() => playTrack(idx)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-xs transition-colors",
                  idx === currentTrack
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-muted hover:bg-accent/5 hover:text-primary"
                )}
              >
                <span className="text-muted mr-1.5">{idx + 1}.</span>
                {article.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <p className="text-xs text-red-500 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
          <button onClick={handleRetry} className="text-xs text-accent hover:underline flex-shrink-0">
            Ponów
          </button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={handleEnded}
        onError={() => { setIsPlaying(false); setError("Nie udało się odtworzyć audio"); }}
      />
    </div>
  );
}
