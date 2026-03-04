import { SITE_URL, SITE_NAME, GITHUB_URL } from "@/lib/seo";
import type { LandingTranslations } from "@/i18n/getLandingTranslations";

interface JsonLdProps {
  locale: string;
  t: LandingTranslations;
}

export function JsonLd({ locale, t }: JsonLdProps) {
  const url = `${SITE_URL}/${locale}`;

  const webSite = {
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description: t.hero.subheadline,
    inLanguage: locale,
  };

  const softwareApplication = {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "NewsApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
  };

  const organization = {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512x512.png`,
    sameAs: [GITHUB_URL],
  };

  const faqPage = {
    "@type": "FAQPage",
    mainEntity: t.features.items.map((item) => ({
      "@type": "Question",
      name: item.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.description,
      },
    })),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [webSite, softwareApplication, organization, faqPage],
  };

  // JSON-LD data is generated from trusted translation files (not user input),
  // so dangerouslySetInnerHTML is safe here — this is the standard Next.js pattern
  // for structured data. See: https://nextjs.org/docs/app/building-your-application/optimizing/metadata#json-ld
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
