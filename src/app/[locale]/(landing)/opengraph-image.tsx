import { ImageResponse } from "next/og";
import { getLandingTranslations } from "@/i18n/getLandingTranslations";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "edge";
export const alt = "Newsroom AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getLandingTranslations(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%)",
          padding: "60px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "white",
            }}
          >
            N
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "white",
            }}
          >
            {SITE_NAME}
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.2,
          }}
        >
          {t.hero.headline}
        </div>

        {/* Badge */}
        <div
          style={{
            marginTop: "32px",
            padding: "12px 32px",
            borderRadius: "100px",
            background: "rgba(99, 102, 241, 0.2)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            fontSize: "24px",
            color: "#a5b4fc",
          }}
        >
          {t.hero.badge}
        </div>
      </div>
    ),
    { ...size }
  );
}
