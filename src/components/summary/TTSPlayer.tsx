"use client";

import { useState, useRef, useEffect } from "react";
import { usePlayerStore } from "@/stores/playerStore";
import { cn } from "@/lib/utils";

interface TTSPlayerProps {
  text: string;
  articleId: string;
}

export function TTSPlayer({ text, articleId }: TTSPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    isPlaying,
    currentArticleId,
    voice,
    progress,
    duration,
    play,
    pause,
    stop,
    setProgress,
    setDuration,
  } = usePlayerStore();

  const isCurrentArticle = currentArticleId === articleId;
  const isActivelyPlaying = isPlaying && isCurrentArticle;

  useEffect(() => {
    return () => {
      // Cleanup audio URL on unmount
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (isActivelyPlaying) {
      pause();
      audioRef.current?.pause();
      return;
    }

    if (isCurrentArticle && audioUrl) {
      play(articleId);
      audioRef.current?.play();
      return;
    }

    // Fetch new audio
    setIsLoadingAudio(true);
    setError(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
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

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);
      play(articleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && isCurrentArticle) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    stop();
  };

  const handleAudioError = () => {
    stop();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setError("Nie udało się odtworzyć audio");
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
    if (audioUrl && audioRef.current && isCurrentArticle && isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  }, [audioUrl, isCurrentArticle, isPlaying]);

  return (
    <div className="bg-surface rounded-xl p-4">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoadingAudio}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isActivelyPlaying
              ? "bg-accent text-white"
              : "bg-accent/10 text-accent hover:bg-accent/20",
            isLoadingAudio && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoadingAudio ? (
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
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>{isCurrentArticle ? formatTime(progress) : "0:00"}</span>
            <span>{isCurrentArticle && duration ? formatTime(duration) : "--:--"}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={isCurrentArticle ? progress : 0}
            onChange={handleSeek}
            disabled={!isCurrentArticle || !audioUrl}
            className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-highlight">{error}</p>
          <button
            onClick={handlePlayPause}
            className="text-xs text-accent hover:underline"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleAudioError}
        />
      )}

      <p className="text-xs text-muted mt-2 text-center">
        Odsłuchaj streszczenie
      </p>
    </div>
  );
}
