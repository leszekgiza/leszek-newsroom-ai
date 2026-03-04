import Link from "next/link";
import { AppMockup } from "./AppMockup";

interface HeroProps {
  t: {
    badge: string;
    headline: string;
    subheadline: string;
    cta: string;
    github: string;
  };
}

export function Hero({ t }: HeroProps) {
  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pt-24 pb-16 text-center md:px-8"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, var(--lp-bg-secondary) 0%, var(--lp-bg-primary) 70%)",
      }}
    >
      {/* Badge */}
      <span
        className="lp-glass mb-6 inline-block rounded-full px-4 py-1.5 text-xs font-medium tracking-wide"
        style={{ color: "var(--lp-secondary)" }}
      >
        {t.badge}
      </span>

      {/* Headline */}
      <h1
        className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl xl:text-7xl"
        style={{
          fontFamily: "var(--font-outfit), sans-serif",
          color: "var(--lp-text)",
        }}
      >
        {t.headline}
      </h1>

      {/* Subheadline */}
      <p
        className="mx-auto mt-6 max-w-2xl text-base leading-relaxed md:text-lg"
        style={{ color: "var(--lp-text-secondary)" }}
      >
        {t.subheadline}
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/register"
          className="rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl"
          style={{
            background: "var(--lp-accent)",
            boxShadow: "0 0 30px var(--lp-accent-glow)",
          }}
        >
          {t.cta}
        </Link>
        <a
          href="https://github.com/leszekgiza/leszek-newsroom-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-all hover:bg-white/5"
          style={{
            borderColor: "var(--lp-border-light)",
            color: "var(--lp-text-secondary)",
          }}
        >
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          {t.github}
        </a>
      </div>

      {/* App Mockup */}
      <AppMockup />

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(to top, var(--lp-bg-primary), transparent)",
        }}
      />
    </section>
  );
}
