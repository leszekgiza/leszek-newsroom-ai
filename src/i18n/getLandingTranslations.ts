import { locales, defaultLocale } from "./config";

export interface LandingTranslations {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    cta: string;
    github: string;
  };
  problem: {
    headline: string;
    items: Array<{ title: string; description: string }>;
  };
  features: {
    headline: string;
    items: Array<{ title: string; description: string }>;
  };
  howItWorks: {
    headline: string;
    steps: Array<{ title: string; description: string }>;
  };
  oss: {
    headline: string;
    bullets: string[];
    githubCta: string;
    docsCta: string;
  };
  premium: {
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
  nav: {
    login: string;
    cta: string;
  };
  footer: {
    copyright: string;
    github: string;
    docs: string;
    privacy: string;
    madeWith: string;
  };
}

export async function getLandingTranslations(
  locale: string
): Promise<LandingTranslations> {
  const validLocale = (locales as readonly string[]).includes(locale)
    ? locale
    : defaultLocale;
  return (await import(`./landing/${validLocale}.json`)).default;
}
