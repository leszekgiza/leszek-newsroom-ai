import { test, expect } from "@playwright/test";

test.describe("Article Links Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "Test123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("all article source URLs should be valid (not 404)", async ({
    page,
    request,
  }) => {
    // Wait for articles to load
    await page.waitForSelector('[data-testid="article-card"]', {
      timeout: 10000,
    });

    // Get all article cards
    const articleCards = await page.locator('[data-testid="article-card"]').all();
    expect(articleCards.length).toBeGreaterThan(0);

    // Check each article's source URL (stored in data-article-url attribute)
    for (const card of articleCards) {
      const sourceUrl = await card.getAttribute("data-article-url");
      const title = await card.locator('[data-testid="article-title"]').textContent();

      if (sourceUrl) {
        // Verify the URL is accessible (not 404)
        const response = await request.head(sourceUrl, {
          timeout: 15000,
          ignoreHTTPSErrors: true,
        });

        expect(
          response.status(),
          `Article "${title}" has broken source link: ${sourceUrl}`
        ).not.toBe(404);
      }
    }
  });

  test("articles should have source URLs", async ({ page }) => {
    await page.waitForSelector('[data-testid="article-card"]', {
      timeout: 10000,
    });

    const articleCards = await page.locator('[data-testid="article-card"]').all();

    for (const card of articleCards) {
      const sourceUrl = await card.getAttribute("data-article-url");
      const title = await card.locator('[data-testid="article-title"]').textContent();

      expect(
        sourceUrl,
        `Article "${title}" is missing source URL`
      ).toBeTruthy();

      expect(
        sourceUrl,
        `Article "${title}" has invalid URL format`
      ).toMatch(/^https?:\/\//);
    }
  });
});
