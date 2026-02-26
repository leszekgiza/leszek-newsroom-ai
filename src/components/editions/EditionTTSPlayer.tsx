"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/stores/playerStore";
import { cn } from "@/lib/utils";

interface PlaylistArticle {
  id: string;
  title: string;
  intro: string | null;
  summary: string | null;
  source: string;
}

interface EditionTTSPlayerProps {
  articles: PlaylistArticle[];
  onArticleListened?: (articleId: string) => void;
}

export function EditionTTSPlayer({ articles, onArticleListened }: EditionTTSPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCacheRef = useRef<Map<number, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [generatingTrack, setGeneratingTrack] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playerStore = usePlayerStore();

  // Don't render if no articles
  if (articles.length === 0) {
    return null;
  }

  const currentArticle = articles[currentTrack];
  const totalTracks = articles.length;

  // Build TTS text for article
  const getArticleTTSText = useCallback((article: PlaylistArticle): string => {
    const content = article.summary || article.intro || "";
    const parts = [`Źródło: ${article.source}.`, article.title + "."];
    if (content) {
      parts.push(content);
    }
    const text = parts.join("\n\n");
    // Truncate to 4900 chars to stay under 5000 limit
    if (text.length > 4900) {
      return text.slice(0, 4897) + "...";
    }
    return text;
  }, []);

  // Generate audio for a track index
  const generateTrackAudio = useCallback(async (
    index: number,
    signal?: AbortSignal
  ): Promise<string | null> => {
    // Return cached if available
    const cached = audioCacheRef.current.get(index);
    if (cached) return cached;

    if (index < 0 || index >= articles.length) return null;

    const article = articles[index];
    const text = getArticleTTSText(article);

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
    if (blob.type && !blob.type.startsWith("audio/")) {
      throw new Error("Otrzymano nieprawidłowy format audio");
    }

    const url = URL.createObjectURL(blob);
    audioCacheRef.current.set(index, url);
    return url;
  }, [articles, getArticleTTSText, playerStore.voice]);

  // Prefetch next track in background
  const prefetchNext = useCallback(async (index: number) => {
    if (index < 0 || index >= articles.length) return;
    if (audioCacheRef.current.has(index)) return;

    // Abort previous prefetch
    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    setGeneratingTrack(index);
    try {
      await generateTrackAudio(index, controller.signal);
    } catch {
      // Silently ignore prefetch errors
    } finally {
      if (!controller.signal.aborted) {
        setGeneratingTrack(null);
      }
    }
  }, [articles.length, generateTrackAudio]);

  // Play a specific track
  const playTrack = useCallback(async (index: number) => {
    if (index < 0 || index >= articles.length) return;

    // Stop card-level TTS
    playerStore.stop();

    // Abort any ongoing generation for current track
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setCurrentTrack(index);
    setError(null);
    setProgress(0);
    setDuration(0);

    const cached = audioCacheRef.current.get(index);
    if (cached) {
      // Instant playback from cache
      if (audioRef.current) {
        audioRef.current.src = cached;
        audioRef.current.currentTime = 0;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          if (!controller.signal.aborted) {
            setError("Nie udało się odtworzyć audio");
          }
        }
      }
      // Prefetch next
      prefetchNext(index + 1);
      return;
    }

    // Generate audio
    setIsLoadingCurrent(true);
    try {
      const url = await generateTrackAudio(index, controller.signal);
      if (controller.signal.aborted) return;

      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
      }

      // Prefetch next
      prefetchNext(index + 1);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingCurrent(false);
      }
    }
  }, [articles.length, generateTrackAudio, prefetchNext, playerStore]);

  // Handlers
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    // If we have audio loaded for current track, resume
    if (audioRef.current?.src && audioRef.current.src !== window.location.href) {
      try {
        // Stop card-level TTS
        playerStore.stop();
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setError("Nie udało się wznowić odtwarzania");
      }
      return;
    }

    // Start from current track
    playTrack(currentTrack);
  }, [isPlaying, currentTrack, playTrack, playerStore]);

  const handleNext = useCallback(() => {
    if (currentTrack < totalTracks - 1) {
      playTrack(currentTrack + 1);
    }
  }, [currentTrack, totalTracks, playTrack]);

  const handlePrev = useCallback(() => {
    if (progress > 3) {
      // Restart current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
    } else if (currentTrack > 0) {
      playTrack(currentTrack - 1);
    } else {
      // Restart first track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
    }
  }, [progress, currentTrack, playTrack]);

  const handleEnded = useCallback(() => {
    // Mark the completed article as read
    const finishedArticle = articles[currentTrack];
    if (finishedArticle && onArticleListened) {
      onArticleListened(finishedArticle.id);
    }

    if (currentTrack < totalTracks - 1) {
      // Auto-advance to next track
      playTrack(currentTrack + 1);
    } else {
      // Last track ended
      setIsPlaying(false);
      setProgress(0);
    }
  }, [currentTrack, totalTracks, playTrack, articles, onArticleListened]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    setError("Nie udało się odtworzyć audio");
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleSkipTrack = () => {
    // Skip errored track and play next
    setError(null);
    if (currentTrack < totalTracks - 1) {
      playTrack(currentTrack + 1);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Remove from cache to force regeneration
    const cached = audioCacheRef.current.get(currentTrack);
    if (cached) {
      URL.revokeObjectURL(cached);
      audioCacheRef.current.delete(currentTrack);
    }
    playTrack(currentTrack);
  };

  // Pause playlist when card-level TTS starts
  useEffect(() => {
    if (playerStore.isPlaying && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [playerStore.isPlaying, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      prefetchAbortRef.current?.abort();
      // Revoke all cached blob URLs
      for (const url of audioCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      audioCacheRef.current.clear();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Status subtitle
  const getSubtitle = () => {
    if (isLoadingCurrent) return "Generowanie audio...";
    if (generatingTrack !== null) return `Generowanie nastepnego (${generatingTrack + 1}/${totalTracks})...`;
    if (isPlaying) return "Odtwarzanie";
    if (error) return "";
    return "Kliknij play, aby odsłuchać artykuły";
  };

  return (
    <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4">
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
          disabled={isLoadingCurrent || currentTrack >= totalTracks - 1}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            "bg-accent/10 text-accent hover:bg-accent/20",
            (isLoadingCurrent || currentTrack >= totalTracks - 1) && "opacity-30 cursor-not-allowed"
          )}
          title="Nastepny"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-primary truncate pr-2">
              {currentArticle.title}
            </span>
            <span className="text-xs text-muted flex-shrink-0">
              {currentTrack + 1}/{totalTracks}
            </span>
          </div>
          <span className="text-xs text-muted truncate block">
            {currentArticle.source}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-muted w-10">
          {formatTime(progress)}
        </span>
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

      {/* Subtitle */}
      {!error && (
        <p className="text-xs text-muted mt-1.5 text-center">
          {getSubtitle()}
        </p>
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
          <button
            onClick={handleRetry}
            className="text-xs text-accent hover:underline flex-shrink-0"
          >
            Ponow
          </button>
          {currentTrack < totalTracks - 1 && (
            <button
              onClick={handleSkipTrack}
              className="text-xs text-muted hover:text-primary hover:underline flex-shrink-0"
            >
              Pomin
            </button>
          )}
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
      />
    </div>
  );
}
