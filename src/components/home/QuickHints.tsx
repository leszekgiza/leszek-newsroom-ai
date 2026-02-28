"use client";

import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";

const hints = [
  { icon: "🎧", label: "Odsluchaj wydanie", action: "tts" },
  { icon: "📰", label: "Co nowego?", action: "search", value: "" },
  { icon: "🔗", label: "Dodaj zrodlo", action: "fill", value: "https://" },
  { icon: "📧", label: "Podlacz Gmail", action: "navigate", value: "/settings/integrations/gmail" },
];

export interface QuickHintsProps {
  onFillInput?: (text: string) => void;
}

export function QuickHints({ onFillInput }: QuickHintsProps) {
  const router = useRouter();
  const { setActiveEditionDate } = useUIStore();

  function handleClick(hint: (typeof hints)[number]) {
    if (hint.action === "fill") {
      onFillInput?.(hint.value!);
    } else if (hint.action === "search") {
      setActiveEditionDate(null);
    } else if (hint.action === "navigate") {
      router.push(hint.value!);
    } else if (hint.action === "tts") {
      const today = new Date().toISOString().slice(0, 10);
      setActiveEditionDate(today);
    }
  }

  return (
    <div className="px-4 py-2 lg:px-0">
      <div className="flex gap-2 overflow-x-auto lg:flex-wrap lg:justify-center scrollbar-none pb-1">
        {hints.map((hint) => (
          <button
            key={hint.label}
            onClick={() => handleClick(hint)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted whitespace-nowrap hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition-colors flex-shrink-0"
          >
            <span>{hint.icon}</span>
            <span>{hint.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
