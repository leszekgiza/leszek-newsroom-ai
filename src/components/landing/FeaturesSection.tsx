import { ScrollReveal } from "./ScrollReveal";

interface FeaturesSectionProps {
  t: {
    headline: string;
    items: Array<{ title: string; description: string }>;
  };
}

const featureIcons = [
  // AI brain icon
  <svg key="ai" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>,
  // Headphones icon
  <svg key="listen" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>,
  // Filter icon
  <svg key="filter" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>,
  // Code icon
  <svg key="oss" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>,
];

const featureColors = [
  "var(--lp-accent)",
  "var(--lp-secondary)",
  "#a78bfa", // purple
  "#34d399", // emerald
];

export function FeaturesSection({ t }: FeaturesSectionProps) {
  return (
    <section
      className="px-5 py-20 md:px-8 md:py-28"
      style={{ background: "var(--lp-bg-secondary)" }}
    >
      <div className="mx-auto max-w-[var(--lp-max-width)]">
        <ScrollReveal>
          <h2
            className="mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl"
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              color: "var(--lp-text)",
            }}
          >
            {t.headline}
          </h2>
        </ScrollReveal>

        <div className="grid gap-6 sm:grid-cols-2">
          {t.items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                className="lp-glass rounded-2xl p-6 transition-all"
                style={{ borderRadius: "var(--lp-radius-lg)" }}
              >
                <div
                  className="mb-4 inline-flex rounded-xl p-3"
                  style={{
                    background: `${featureColors[i]}15`,
                    color: featureColors[i],
                  }}
                >
                  {featureIcons[i]}
                </div>
                <h3
                  className="mb-2 text-lg font-semibold"
                  style={{
                    fontFamily: "var(--font-outfit), sans-serif",
                    color: "var(--lp-text)",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--lp-text-secondary)" }}
                >
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
