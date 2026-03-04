import { jwtVerify } from "jose";
import { locales, defaultLocale } from "./i18n/config";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
);

export type MiddlewareAction =
  | { type: "passthrough" }
  | { type: "rewrite"; locale: string }
  | { type: "redirect"; url: string };

export function parseAcceptLanguage(
  header: string | undefined | null
): string {
  if (!header) return defaultLocale;

  const parsed = header
    .split(",")
    .map((part) => {
      const [lang, qStr] = part.trim().split(";q=");
      const q = qStr ? parseFloat(qStr) : 1.0;
      const code = lang.split("-")[0].toLowerCase();
      return { code, q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { code } of parsed) {
    if ((locales as readonly string[]).includes(code)) {
      return code;
    }
  }

  return defaultLocale;
}

async function verifySession(
  sessionToken: string | null
): Promise<boolean> {
  if (!sessionToken) return false;
  try {
    await jwtVerify(sessionToken, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

const LOCALE_PATTERN = new RegExp(
  `^/(${locales.join("|")})(?:/.*)?$`
);

export async function getMiddlewareAction(
  pathname: string,
  sessionToken: string | null,
  acceptLanguage: string | undefined | null
): Promise<MiddlewareAction> {
  // Pass through static assets, API routes, auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/reset-password") ||
    pathname.includes(".") // static files (favicon, icons, etc.)
  ) {
    return { type: "passthrough" };
  }

  const isAuthenticated = await verifySession(sessionToken);
  const localeMatch = pathname.match(LOCALE_PATTERN);

  // Locale routes (/pl, /en, /de, etc.)
  if (localeMatch) {
    if (isAuthenticated) {
      return { type: "redirect", url: "/" };
    }
    return { type: "passthrough" };
  }

  // Root path (/)
  if (pathname === "/") {
    if (isAuthenticated) {
      return { type: "passthrough" };
    }
    const locale = parseAcceptLanguage(acceptLanguage);
    return { type: "rewrite", locale };
  }

  return { type: "passthrough" };
}
