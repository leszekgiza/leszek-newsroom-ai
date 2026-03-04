import { ScrollReveal } from "./ScrollReveal";

interface HowItWorksProps {
  t: {
    headline: string;
    steps: Array<{ title: string; description: string }>;
  };
}

export function HowItWorks({ t }: HowItWorksProps) {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[var(--lp-max-width)]">
        <ScrollReveal>
          <h2
            className="mb-16 text-center text-2xl font-bold md:text-3xl lg:text-4xl"
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              color: "var(--lp-text)",
            }}
          >
            {t.headline}
          </h2>
        </ScrollReveal>

        <div className="relative grid gap-8 md:grid-cols-3 md:gap-12">
          {/* Connector line (desktop) */}
          <div
            className="pointer-events-none absolute top-10 right-1/6 left-1/6 hidden h-0.5 md:block"
            style={{ background: "var(--lp-border-light)" }}
          />

          {t.steps.map((step, i) => (
            <ScrollReveal key={i} delay={i * 150}>
              <div className="relative text-center">
                {/* Step number */}
                <div
                  className="relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  style={{
                    background: "var(--lp-bg-secondary)",
                    border: "2px solid var(--lp-accent)",
                    color: "var(--lp-accent)",
                    fontFamily: "var(--font-outfit), sans-serif",
                    boxShadow: "0 0 20px var(--lp-accent-glow)",
                  }}
                >
                  {i + 1}
                </div>

                <h3
                  className="mb-2 text-lg font-semibold"
                  style={{
                    fontFamily: "var(--font-outfit), sans-serif",
                    color: "var(--lp-text)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--lp-text-secondary)" }}
                >
                  {step.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
