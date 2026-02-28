"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { toast } from "sonner";
import {
  Link,
  Search,
  Sparkles,
  Mic,
  ArrowUp,
} from "lucide-react";

export interface CommandBoxProps {
  onAddSource?: (url: string) => void;
}

function isUrl(text: string): boolean {
  return /https?:\/\//.test(text) || /^[\w-]+(\.[\w-]+)+/.test(text);
}

function normalizeUrl(text: string): string {
  if (/^https?:\/\//.test(text)) return text;
  return `https://${text}`;
}

export function CommandBox({ onAddSource }: CommandBoxProps) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const { setSearchQuery } = useUIStore();

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (isUrl(trimmed)) {
      const normalized = normalizeUrl(trimmed);
      if (onAddSource) {
        onAddSource(normalized);
      } else {
        router.push(`/settings/sources?addUrl=${encodeURIComponent(normalized)}`);
      }
      setValue("");
    } else {
      setSearchQuery(trimmed);
      setValue("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleAddUrl() {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.info("Wklej URL w pole powyzej");
      return;
    }
    handleSubmit();
  }

  function handleSearch() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setValue("");
  }

  function handleAskAI() {
    toast.info("Wkrotce dostepne", {
      description: "Funkcja AI Q&A bedzie dostepna w przyszlej wersji.",
    });
  }

  function handleMic() {
    toast.info("Wkrotce dostepne", {
      description: "Funkcja rozpoznawania mowy bedzie dostepna wkrotce.",
    });
  }

  return (
    <div className="px-4 py-2 lg:px-0">
      <div className="bg-card border border-border rounded-2xl p-3 lg:p-4 shadow-sm focus-within:border-accent focus-within:shadow-md transition-all">
        {/* Input row */}
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
            className="flex-1 bg-transparent text-primary text-sm lg:text-base outline-none placeholder:text-muted/60"
          />

          {/* Mobile mic button */}
          <button
            type="button"
            onClick={handleMic}
            aria-label="Mikrofon"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted hover:text-primary transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            aria-label="Wyslij"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop action buttons */}
        <div className="hidden lg:flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleAddUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Link className="w-3.5 h-3.5" />
            Dodaj URL
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Szukaj
          </button>
          <button
            type="button"
            onClick={handleAskAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Zapytaj AI
          </button>
          <button
            type="button"
            onClick={handleMic}
            aria-label="Mikrofon"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:text-primary hover:border-primary/30 transition-colors ml-auto"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
