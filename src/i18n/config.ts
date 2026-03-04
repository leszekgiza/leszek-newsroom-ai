export const locales = ["pl", "en", "de", "fr", "es", "it", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pl";
export const rtlLocales: readonly string[] = ["ar"];

export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

export function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale);
}
