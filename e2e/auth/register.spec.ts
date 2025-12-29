import { test, expect } from "@playwright/test";

test.describe("Register Page Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("renders register form correctly", async ({ page }) => {
    // Logo should be visible
    const logo = page.locator("svg").first();
    await expect(logo).toBeVisible();

    // Title should be visible
    await expect(page.getByRole("heading", { name: "Newsroom AI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stwórz konto" })).toBeVisible();

    // Form elements should be visible
    await expect(page.getByPlaceholder("Jan Kowalski")).toBeVisible();
    await expect(page.getByPlaceholder("jan@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("Min. 8 znaków")).toBeVisible();
    await expect(page.getByRole("button", { name: "Zarejestruj się" })).toBeVisible();

    // Password hint should be visible
    await expect(page.getByText("Minimum 8 znaków, wielka litera i cyfra")).toBeVisible();

    // Login link should be visible
    await expect(page.getByText("Masz już konto?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Zaloguj się" })).toBeVisible();
  });

  test("form container has correct width on desktop", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip();
    }

    const container = page.locator(".max-w-md").first();
    await expect(container).toBeVisible();

    const box = await container.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(400);
    expect(box!.width).toBeLessThanOrEqual(500);
  });

  test("inputs have correct width", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Jan Kowalski");
    const emailInput = page.getByPlaceholder("jan@example.com");
    const passwordInput = page.getByPlaceholder("Min. 8 znaków");

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    const nameBox = await nameInput.boundingBox();
    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();

    expect(nameBox).toBeTruthy();
    expect(emailBox).toBeTruthy();
    expect(passwordBox).toBeTruthy();

    // On desktop, inputs should be at least 300px wide
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      expect(nameBox!.width).toBeGreaterThan(300);
      expect(emailBox!.width).toBeGreaterThan(300);
      expect(passwordBox!.width).toBeGreaterThan(300);
    }

    // On mobile, inputs should still be reasonably wide
    expect(nameBox!.width).toBeGreaterThan(250);
    expect(emailBox!.width).toBeGreaterThan(250);
    expect(passwordBox!.width).toBeGreaterThan(250);
  });

  test("visual regression - desktop", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
      test.skip();
    }

    await expect(page).toHaveScreenshot("register-desktop.png", {
      maxDiffPixelRatio: 0.1,
    });
  });

  test("visual regression - mobile", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width > 500) {
      test.skip();
    }

    await expect(page).toHaveScreenshot("register-mobile.png", {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe("Register Functionality", () => {
  test("navigates to login page", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Zaloguj się" }).click();

    await expect(page).toHaveURL("/login");
  });

  test("password toggle button works", async ({ page }) => {
    await page.goto("/register");

    const passwordInput = page.getByPlaceholder("Min. 8 znaków");
    const toggleButton = page.locator("button[type='button']").filter({ has: page.locator("svg") });

    await expect(passwordInput).toHaveAttribute("type", "password");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});
