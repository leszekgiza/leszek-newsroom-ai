import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "../Hero";
import { ProblemSection } from "../ProblemSection";
import { FeaturesSection } from "../FeaturesSection";
import { HowItWorks } from "../HowItWorks";
import { OpenSourceSection } from "../OpenSourceSection";
import { LandingFooter } from "../LandingFooter";
import { LandingNavbar } from "../LandingNavbar";
import { ScrollReveal } from "../ScrollReveal";

const heroT = {
  badge: "Open Source · Darmowy · Self-hosted",
  headline: "20 źródeł. 5 minut. Tylko to, co ważne.",
  subheadline: "Newsroom AI wybiera najważniejsze treści.",
  cta: "Zacznij za darmo →",
  github: "Zobacz na GitHub",
};

const problemT = {
  headline: "80% profesjonalistów czuje przytłoczenie.",
  items: [
    { title: "Nadmiar źródeł", description: "Opis 1" },
    { title: "Szum informacyjny", description: "Opis 2" },
    { title: "Brak czasu", description: "Opis 3" },
  ],
};

const featuresT = {
  headline: "Mniej szumu. Więcej wartości.",
  items: [
    { title: "AI wyciąga esencję", description: "Opis A" },
    { title: "Słuchaj zamiast czytaj", description: "Opis B" },
    { title: "Twoje źródła, zero szumu", description: "Opis C" },
    { title: "Open Source, Twoje zasady", description: "Opis D" },
  ],
};

const howItWorksT = {
  headline: "Jak to działa?",
  steps: [
    { title: "Wybierz źródła", description: "Step 1" },
    { title: "AI streszcza", description: "Step 2" },
    { title: "Słuchaj lub czytaj", description: "Step 3" },
  ],
};

const ossT = {
  headline: "Darmowy. Otwarty. Pod Twoją kontrolą.",
  bullets: ["AGPL-3.0", "BYO keys", "Self-hosted", "Zero vendor lock-in"],
  githubCta: "GitHub repo",
  docsCta: "Dokumentacja",
};

const navT = {
  login: "Zaloguj się",
  cta: "Zacznij za darmo",
};

const footerT = {
  copyright: "© 2026 Newsroom AI. AGPL-3.0.",
  github: "GitHub",
  docs: "Dokumentacja",
  privacy: "Prywatność",
  madeWith: "Zrobione z ❤️",
};

describe("Hero", () => {
  it("renders headline", () => {
    render(<Hero t={heroT} />);
    expect(screen.getByText(heroT.headline)).toBeInTheDocument();
  });

  it("renders badge", () => {
    render(<Hero t={heroT} />);
    expect(screen.getByText(heroT.badge)).toBeInTheDocument();
  });

  it("renders subheadline", () => {
    render(<Hero t={heroT} />);
    expect(screen.getByText(heroT.subheadline)).toBeInTheDocument();
  });

  it("renders CTA button", () => {
    render(<Hero t={heroT} />);
    expect(screen.getByText(heroT.cta)).toBeInTheDocument();
  });

  it("renders GitHub link", () => {
    render(<Hero t={heroT} />);
    expect(screen.getByText(heroT.github)).toBeInTheDocument();
  });
});

describe("ProblemSection", () => {
  it("renders headline", () => {
    render(<ProblemSection t={problemT} />);
    expect(screen.getByText(problemT.headline)).toBeInTheDocument();
  });

  it("renders all 3 pain point items", () => {
    render(<ProblemSection t={problemT} />);
    for (const item of problemT.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });
});

describe("FeaturesSection", () => {
  it("renders headline", () => {
    render(<FeaturesSection t={featuresT} />);
    expect(screen.getByText(featuresT.headline)).toBeInTheDocument();
  });

  it("renders all 4 feature items", () => {
    render(<FeaturesSection t={featuresT} />);
    for (const item of featuresT.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });
});

describe("HowItWorks", () => {
  it("renders headline", () => {
    render(<HowItWorks t={howItWorksT} />);
    expect(screen.getByText(howItWorksT.headline)).toBeInTheDocument();
  });

  it("renders all 3 steps", () => {
    render(<HowItWorks t={howItWorksT} />);
    for (const step of howItWorksT.steps) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(screen.getByText(step.description)).toBeInTheDocument();
    }
  });

  it("renders step numbers", () => {
    render(<HowItWorks t={howItWorksT} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("OpenSourceSection", () => {
  it("renders headline", () => {
    render(<OpenSourceSection t={ossT} />);
    expect(screen.getByText(ossT.headline)).toBeInTheDocument();
  });

  it("renders all bullets", () => {
    render(<OpenSourceSection t={ossT} />);
    for (const bullet of ossT.bullets) {
      expect(screen.getByText(bullet)).toBeInTheDocument();
    }
  });

  it("renders GitHub CTA", () => {
    render(<OpenSourceSection t={ossT} />);
    expect(screen.getByText(ossT.githubCta)).toBeInTheDocument();
  });
});

describe("LandingNavbar", () => {
  it("renders login link", () => {
    render(<LandingNavbar t={navT} locale="pl" />);
    expect(screen.getByText(navT.login)).toBeInTheDocument();
  });

  it("renders CTA button", () => {
    render(<LandingNavbar t={navT} locale="pl" />);
    expect(screen.getByText(navT.cta)).toBeInTheDocument();
  });

  it("renders logo text", () => {
    render(<LandingNavbar t={navT} locale="pl" />);
    expect(screen.getByText("Newsroom AI")).toBeInTheDocument();
  });
});

describe("LandingFooter", () => {
  it("renders copyright", () => {
    render(<LandingFooter t={footerT} />);
    expect(screen.getByText(footerT.copyright)).toBeInTheDocument();
  });

  it("renders madeWith", () => {
    render(<LandingFooter t={footerT} />);
    expect(screen.getByText(footerT.madeWith)).toBeInTheDocument();
  });
});

describe("ScrollReveal", () => {
  it("renders children", () => {
    render(
      <ScrollReveal>
        <div>Test content</div>
      </ScrollReveal>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});
