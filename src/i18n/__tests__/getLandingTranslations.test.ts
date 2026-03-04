import { describe, it, expect } from "vitest";
import { getLandingTranslations } from "../getLandingTranslations";

describe("getLandingTranslations", () => {
  it("loads PL translations", async () => {
    const t = await getLandingTranslations("pl");
    expect(t.hero.headline).toBeDefined();
    expect(t.hero.cta).toBeDefined();
    expect(t.nav.login).toBeDefined();
  });

  it("loads EN translations", async () => {
    const t = await getLandingTranslations("en");
    expect(t.hero.headline).toBeDefined();
    expect(typeof t.hero.headline).toBe("string");
  });

  it("falls back to PL for invalid locale", async () => {
    const t = await getLandingTranslations("xx");
    const plT = await getLandingTranslations("pl");
    expect(t.hero.headline).toBe(plT.hero.headline);
  });

  it("falls back to PL for empty string", async () => {
    const t = await getLandingTranslations("");
    const plT = await getLandingTranslations("pl");
    expect(t.hero.headline).toBe(plT.hero.headline);
  });

  it("has all required sections", async () => {
    const t = await getLandingTranslations("pl");
    expect(t.hero).toBeDefined();
    expect(t.problem).toBeDefined();
    expect(t.features).toBeDefined();
    expect(t.howItWorks).toBeDefined();
    expect(t.oss).toBeDefined();
    expect(t.premium).toBeDefined();
    expect(t.nav).toBeDefined();
    expect(t.footer).toBeDefined();
  });

  it("hero has all required keys", async () => {
    const t = await getLandingTranslations("pl");
    expect(t.hero.badge).toBeDefined();
    expect(t.hero.headline).toBeDefined();
    expect(t.hero.subheadline).toBeDefined();
    expect(t.hero.cta).toBeDefined();
    expect(t.hero.github).toBeDefined();
  });

  it("problem has headline and items array", async () => {
    const t = await getLandingTranslations("pl");
    expect(t.problem.headline).toBeDefined();
    expect(Array.isArray(t.problem.items)).toBe(true);
    expect(t.problem.items.length).toBe(3);
    expect(t.problem.items[0].title).toBeDefined();
    expect(t.problem.items[0].description).toBeDefined();
  });

  it("features has items with title and description", async () => {
    const t = await getLandingTranslations("pl");
    expect(t.features.headline).toBeDefined();
    expect(Array.isArray(t.features.items)).toBe(true);
    expect(t.features.items.length).toBe(4);
  });

  it("howItWorks has steps", async () => {
    const t = await getLandingTranslations("pl");
    expect(Array.isArray(t.howItWorks.steps)).toBe(true);
    expect(t.howItWorks.steps.length).toBe(3);
  });
});
