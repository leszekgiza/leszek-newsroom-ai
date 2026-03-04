import { notFound } from "next/navigation";
import { locales, isValidLocale } from "@/i18n/config";
import { getLandingTranslations } from "@/i18n/getLandingTranslations";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { OpenSourceSection } from "@/components/landing/OpenSourceSection";
import { PremiumTeaser } from "@/components/landing/PremiumTeaser";
import { LandingFooter } from "@/components/landing/LandingFooter";
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
  return {
    title: `Newsroom AI — ${t.hero.headline}`,
    description: t.hero.subheadline,
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
    </main>
  );
}
