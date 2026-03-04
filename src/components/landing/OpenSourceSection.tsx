import { ScrollReveal } from "./ScrollReveal";

interface OpenSourceSectionProps {
  t: {
    headline: string;
    bullets: string[];
    githubCta: string;
    docsCta: string;
  };
}

export function OpenSourceSection({ t }: OpenSourceSectionProps) {
  return (
    <section
      className="px-5 py-20 md:px-8 md:py-28"
      style={{ background: "var(--lp-bg-secondary)" }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <h2
            className="mb-8 text-2xl font-bold md:text-3xl lg:text-4xl"
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              color: "var(--lp-text)",
            }}
          >
            {t.headline}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <ul className="mb-10 space-y-3 text-left">
            {t.bullets.map((bullet, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-base"
                style={{ color: "var(--lp-text-secondary)" }}
              >
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: "var(--lp-secondary)" }}
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
                {bullet}
              </li>
            ))}
          </ul>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
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
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              {t.githubCta}
            </a>
            <a
              href="https://github.com/leszekgiza/leszek-newsroom-ai#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--lp-secondary)" }}
            >
              {t.docsCta} →
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
