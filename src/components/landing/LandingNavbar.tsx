"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface LandingNavbarProps {
  t: { login: string; cta: string };
  locale: string;
}

export function LandingNavbar({ t, locale }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "py-3" : "py-5"
      }`}
      style={{
        background: scrolled
          ? "rgba(10, 14, 39, 0.85)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--lp-border)"
          : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex max-w-[var(--lp-max-width)] items-center justify-between px-5 md:px-8">
        {/* Logo */}
        <a href={`/${locale}`} className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: "var(--lp-accent)", color: "white" }}
          >
            N
          </div>
          <span
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              color: "var(--lp-text)",
            }}
          >
            Newsroom AI
          </span>
        </a>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <Link
            href="/login"
            className="hidden text-sm transition-colors hover:opacity-80 sm:inline-block"
            style={{ color: "var(--lp-text-secondary)" }}
          >
            {t.login}
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
            style={{ background: "var(--lp-accent)" }}
          >
            {t.cta}
          </Link>
        </div>
      </div>
    </nav>
  );
}
