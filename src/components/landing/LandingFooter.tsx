interface LandingFooterProps {
  t: {
    copyright: string;
    github: string;
    docs: string;
    privacy: string;
    madeWith: string;
  };
}

export function LandingFooter({ t }: LandingFooterProps) {
  return (
    <footer
      className="border-t px-5 py-10 md:px-8"
      style={{ borderColor: "var(--lp-border)" }}
    >
      <div className="mx-auto max-w-[var(--lp-max-width)]">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <p
            className="text-xs"
            style={{ color: "var(--lp-text-muted)" }}
          >
            {t.copyright}
          </p>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/leszekgiza/leszek-newsroom-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--lp-text-secondary)" }}
            >
              {t.github}
            </a>
            <a
              href="https://github.com/leszekgiza/leszek-newsroom-ai#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--lp-text-secondary)" }}
            >
              {t.docs}
            </a>
          </div>
        </div>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--lp-text-muted)" }}
        >
          {t.madeWith}
        </p>
      </div>
    </footer>
  );
}
