"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditionTTSPlayerProps {
  editionId: string;
  articleCount: number;
}

export function EditionTTSPlayer({ editionId, articleCount }: EditionTTSPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      // Cleanup audio URL on unmount
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    // Fetch new audio
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/editions/${editionId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: "pl-PL-MarekNeural" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Nie udało się wygenerować audio");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-play when audioUrl is set
  useEffect(() => {
    if (audioUrl && audioRef.current && isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  }, [audioUrl, isPlaying]);

  return (
    <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4">
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isPlaying
              ? "bg-accent text-white shadow-lg shadow-accent/30"
              : "bg-accent/20 text-accent hover:bg-accent/30",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
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

        {/* Info and Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-primary">
              Odsłuchaj całe wydanie
            </span>
            <span className="text-xs text-muted">
              {articleCount} {articleCount === 1 ? "artykuł" : articleCount < 5 ? "artykuły" : "artykułów"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted w-10">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              disabled={!audioUrl}
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
          <p className="text-xs text-muted mt-1">
            {isLoading
              ? "Generowanie audio..."
              : isPlaying
                ? "Odtwarzanie..."
                : "Źródło → Tytuł → Streszczenie"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}
    </div>
  );
}
