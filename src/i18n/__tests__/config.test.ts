import { describe, it, expect } from "vitest";
import { locales, defaultLocale, rtlLocales, isValidLocale, isRtlLocale } from "../config";

describe("i18n config", () => {
  it("should export supported locales", () => {
    expect(locales).toContain("pl");
    expect(locales).toContain("en");
    expect(locales).toContain("ar");
    expect(locales.length).toBe(7);
  });

  it("should have pl as default locale", () => {
    expect(defaultLocale).toBe("pl");
  });

  it("should have ar as RTL locale", () => {
    expect(rtlLocales).toContain("ar");
    expect(rtlLocales.length).toBe(1);
  });

  describe("isValidLocale", () => {
    it("returns true for supported locales", () => {
      expect(isValidLocale("pl")).toBe(true);
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("de")).toBe(true);
    });

    it("returns false for unsupported locales", () => {
      expect(isValidLocale("xx")).toBe(false);
      expect(isValidLocale("")).toBe(false);
      expect(isValidLocale("PL")).toBe(false);
    });
  });

  describe("isRtlLocale", () => {
    it("returns true for RTL locales", () => {
      expect(isRtlLocale("ar")).toBe(true);
    });

    it("returns false for LTR locales", () => {
      expect(isRtlLocale("pl")).toBe(false);
      expect(isRtlLocale("en")).toBe(false);
    });
  });
});
