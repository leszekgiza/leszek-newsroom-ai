export function AppMockup() {
  return (
    <div className="lp-float relative mx-auto mt-12 max-w-4xl lg:mt-16">
      <div
        className="lp-glass rounded-2xl p-4 md:p-6"
        style={{ borderRadius: "var(--lp-radius-xl)" }}
      >
        {/* Fake app header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500/60" />
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-500/60" />
            <span className="inline-block h-3 w-3 rounded-full bg-green-500/60" />
          </div>
          <div
            className="h-6 flex-1 rounded-md"
            style={{ background: "var(--lp-border)" }}
          />
        </div>

        {/* Fake content rows */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: "var(--lp-bg-secondary)" }}
            >
              <div
                className="mt-1 h-10 w-10 shrink-0 rounded-lg"
                style={{
                  background:
                    i === 1
                      ? "var(--lp-accent)"
                      : i === 2
                        ? "var(--lp-secondary)"
                        : "var(--lp-text-muted)",
                  opacity: 0.4,
                }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-4 rounded"
                  style={{
                    background: "var(--lp-text-secondary)",
                    opacity: 0.4,
                    width: `${85 - i * 10}%`,
                  }}
                />
                <div
                  className="h-3 rounded"
                  style={{
                    background: "var(--lp-text-muted)",
                    opacity: 0.3,
                    width: `${95 - i * 5}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--lp-accent-glow) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
