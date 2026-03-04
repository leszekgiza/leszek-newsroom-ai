"use client";

import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

interface PremiumTeaserProps {
  t: {
    headline: string;
    subheadline: string;
    features: string[];
    cta: string;
    emailPlaceholder: string;
    privacy: string;
    success: string;
    alreadySignedUp: string;
    error: string;
  };
  locale: string;
}

export function PremiumTeaser({ t, locale }: PremiumTeaserProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "duplicate" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/landing/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else if (res.status === 409) {
        setStatus("duplicate");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-2xl">
        <ScrollReveal>
          <div
            className="lp-glass rounded-3xl p-8 text-center md:p-12"
            style={{
              borderRadius: "var(--lp-radius-xl)",
              background:
                "linear-gradient(135deg, var(--lp-bg-card) 0%, rgba(255, 77, 109, 0.05) 100%)",
            }}
          >
            <h2
              className="mb-3 text-2xl font-bold md:text-3xl"
              style={{
                fontFamily: "var(--font-outfit), sans-serif",
                color: "var(--lp-text)",
              }}
            >
              {t.headline}
            </h2>
            <p
              className="mb-8 text-sm leading-relaxed md:text-base"
              style={{ color: "var(--lp-text-secondary)" }}
            >
              {t.subheadline}
            </p>

            {/* Feature list */}
            <ul className="mb-8 space-y-2 text-left">
              {t.features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: "var(--lp-text-secondary)" }}
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--lp-accent)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* Email signup form */}
            {status === "success" ? (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--lp-secondary)" }}
              >
                {t.success}
              </p>
            ) : status === "duplicate" ? (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--lp-secondary)" }}
              >
                {t.alreadySignedUp}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="flex-1 rounded-full border bg-transparent px-5 py-3 text-sm outline-none transition-colors focus:border-[var(--lp-accent)]"
                    style={{
                      borderColor: "var(--lp-border-light)",
                      color: "var(--lp-text)",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: "var(--lp-accent)" }}
                  >
                    {status === "loading" ? "..." : t.cta}
                  </button>
                </div>
                {status === "error" && (
                  <p className="text-xs" style={{ color: "var(--lp-accent)" }}>
                    {t.error}
                  </p>
                )}
                <p
                  className="text-xs"
                  style={{ color: "var(--lp-text-muted)" }}
                >
                  {t.privacy}
                </p>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
