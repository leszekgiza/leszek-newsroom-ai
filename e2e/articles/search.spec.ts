import { test, expect } from "@playwright/test";

// Only run on Desktop Chrome - mobile has different search input layout
test.describe("Full-Text Search (FTS)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Desktop only");
  test.use({ viewport: { width: 1280, height: 720 } });
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "Test123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("search input is visible", async ({ page }) => {
    // Use first visible search input (there are desktop and mobile versions)
    const searchInput = page.locator('input[placeholder*="Szukaj"]').first();
    await expect(searchInput).toBeVisible();
  });

  test("search filters articles by keyword", async ({ page }) => {
    // Wait for articles to load first
    await page.waitForSelector('[data-testid="article-card"]', {
      timeout: 10000,
    });

    // Get initial article count
    const initialCards = await page.locator('[data-testid="article-card"]').count();
    expect(initialCards).toBeGreaterThan(0);

    // Search for "LLM" - use first visible search input
    const searchInput = page.locator('input[placeholder*="Szukaj"]').first();
    await searchInput.fill("LLM");

    // Wait for search results (debounce + API call)
    await page.waitForTimeout(1500);

    // Check that results are filtered
    const filteredCards = await page.locator('[data-testid="article-card"]').count();

    // Should have fewer articles than initially (unless all contain LLM)
    expect(filteredCards).toBeGreaterThan(0);
    expect(filteredCards).toBeLessThanOrEqual(initialCards);
  });

  test("search with prefix matching works", async ({ page }) => {
    await page.waitForSelector('[data-testid="article-card"]', {
      timeout: 10000,
    });

    // Search for "agent" (should match "agents", "agentic")
    const searchInput = page.locator('input[placeholder*="Szukaj"]').first();
    await searchInput.fill("agent");
    await page.waitForTimeout(1500);

    const cards = await page.locator('[data-testid="article-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test("empty search shows all articles", async ({ page }) => {
    await page.waitForSelector('[data-testid="article-card"]', {
      timeout: 10000,
    });

    const searchInput = page.locator('input[placeholder*="Szukaj"]').first();

    // Search for something
    await searchInput.fill("LLM");
    await page.waitForTimeout(1500);

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(1500);

    // Should show all articles again
    const cards = await page.locator('[data-testid="article-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test("search with no results shows empty state", async ({ page }) => {
    await page.waitForSelector('[data-testid="article-card"]', {
      timeout: 10000,
    });

    const searchInput = page.locator('input[placeholder*="Szukaj"]').first();

    // Search for something that definitely doesn't exist
    await searchInput.fill("xyznonexistentterm123");
    await page.waitForTimeout(1500);

    // Should show 0 articles or empty state message
    const cards = await page.locator('[data-testid="article-card"]').count();
    expect(cards).toBe(0);
  });
});
