import { Outfit, DM_Sans } from "next/font/google";
import { isRtlLocale } from "@/i18n/config";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default async function LandingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <div
      lang={locale}
      dir={dir}
      className={`landing-theme ${outfit.variable} ${dmSans.variable}`}
      style={{
        background: "var(--lp-bg-primary)",
        color: "var(--lp-text)",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}
