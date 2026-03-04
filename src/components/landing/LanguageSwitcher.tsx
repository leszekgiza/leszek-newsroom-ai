"use client";

import { useState, useRef, useEffect } from "react";
import { locales } from "@/i18n/config";

const localeLabels: Record<string, string> = {
  pl: "PL",
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  ar: "AR",
};

interface LanguageSwitcherProps {
  locale: string;
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/10"
        style={{ color: "var(--lp-text-secondary)" }}
        aria-label="Change language"
      >
        {localeLabels[locale] || locale.toUpperCase()}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="lp-glass absolute top-full mt-1 min-w-[80px] rounded-lg py-1 shadow-lg ltr:right-0 rtl:left-0"
          style={{ zIndex: 50 }}
        >
          {locales.map((loc) => (
            <a
              key={loc}
              href={`/${loc}`}
              className={`block px-3 py-1.5 text-sm transition-colors hover:bg-white/10 ${
                loc === locale ? "font-semibold" : ""
              }`}
              style={{
                color:
                  loc === locale
                    ? "var(--lp-accent)"
                    : "var(--lp-text-secondary)",
              }}
              onClick={() => setIsOpen(false)}
            >
              {localeLabels[loc]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
