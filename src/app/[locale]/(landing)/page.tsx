import { notFound } from "next/navigation";
import { locales, isValidLocale } from "@/i18n/config";
import { getLandingTranslations } from "@/i18n/getLandingTranslations";
import { SITE_URL, SITE_NAME, ogLocaleMap } from "@/lib/seo";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { OpenSourceSection } from "@/components/landing/OpenSourceSection";
import { PremiumTeaser } from "@/components/landing/PremiumTeaser";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { JsonLd } from "./JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getLandingTranslations(locale);

  const title = `${SITE_NAME} — ${t.hero.headline}`;
  const description = t.hero.subheadline;
  const url = `${SITE_URL}/${locale}`;

  return {
    title,
    description,
    keywords: [
      "news aggregator",
      "AI summaries",
      "text-to-speech",
      "RSS reader",
      "open source",
      "newsroom",
    ],
    authors: [{ name: "Leszek Giza" }],
    creator: "Leszek Giza",
    publisher: SITE_NAME,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}`])
      ),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: ogLocaleMap[locale] || "en_US",
      alternateLocale: locales
        .filter((l) => l !== locale)
        .map((l) => ogLocaleMap[l])
        .filter(Boolean),
      type: "website",
      images: [
        {
          url: `${SITE_URL}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/${locale}/opengraph-image`],
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const t = await getLandingTranslations(locale);

  return (
    <main>
      <LandingNavbar t={t.nav} locale={locale} />
      <Hero t={t.hero} />
      <ProblemSection t={t.problem} />
      <FeaturesSection t={t.features} />
      <HowItWorks t={t.howItWorks} />
      <OpenSourceSection t={t.oss} />
      <PremiumTeaser t={t.premium} locale={locale} />
      <LandingFooter t={t.footer} />
      <JsonLd locale={locale} t={t} />
    </main>
  );
}
