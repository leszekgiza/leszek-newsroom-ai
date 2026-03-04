import { ScrollReveal } from "./ScrollReveal";

interface ProblemSectionProps {
  t: {
    headline: string;
    items: Array<{ title: string; description: string }>;
  };
}

const icons = [
  // Overflow icon
  <svg key="overflow" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>,
  // Noise icon
  <svg key="noise" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>,
  // Time icon
  <svg key="time" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
];

export function ProblemSection({ t }: ProblemSectionProps) {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
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

        <div className="grid gap-6 md:grid-cols-3">
          {t.items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                className="lp-glass rounded-2xl p-6 transition-all"
                style={{ borderRadius: "var(--lp-radius-lg)" }}
              >
                <div
                  className="mb-4 inline-flex rounded-xl p-3"
                  style={{
                    background: "rgba(255, 77, 109, 0.1)",
                    color: "var(--lp-accent)",
                  }}
                >
                  {icons[i]}
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
