import { test, expect } from "@playwright/test";

test.describe("Login Page Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form correctly", async ({ page }) => {
    // Logo should be visible
    const logo = page.locator("svg").first();
    await expect(logo).toBeVisible();

    // Title should be visible
    await expect(page.getByRole("heading", { name: "Newsroom AI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();

    // Form elements should be visible
    await expect(page.getByPlaceholder("jan@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Zaloguj się" })).toBeVisible();

    // Register link should be visible
    await expect(page.getByText("Nie masz konta?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Zarejestruj się" })).toBeVisible();
  });

  test("form container has correct width on desktop", async ({ page }) => {
    // Skip on mobile
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip();
    }

    // Container should have max-w-md (448px)
    const container = page.locator(".max-w-md").first();
    await expect(container).toBeVisible();

    const box = await container.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(400);
    expect(box!.width).toBeLessThanOrEqual(500);
  });

  test("inputs have correct width", async ({ page }) => {
    const emailInput = page.getByPlaceholder("jan@example.com");
    const passwordInput = page.getByPlaceholder("••••••••");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Inputs should be full width within their container
    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();

    expect(emailBox).toBeTruthy();
    expect(passwordBox).toBeTruthy();

    // On desktop, inputs should be at least 300px wide
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      expect(emailBox!.width).toBeGreaterThan(300);
      expect(passwordBox!.width).toBeGreaterThan(300);
    }

    // On mobile, inputs should still be reasonably wide
    expect(emailBox!.width).toBeGreaterThan(250);
    expect(passwordBox!.width).toBeGreaterThan(250);
  });

  test("text does not break incorrectly", async ({ page }) => {
    // Check that titles are on single lines (not broken into multiple lines)
    const mainTitle = page.getByRole("heading", { name: "Newsroom AI" });
    const formTitle = page.getByRole("heading", { name: "Zaloguj się" });

    const mainTitleBox = await mainTitle.boundingBox();
    const formTitleBox = await formTitle.boundingBox();

    expect(mainTitleBox).toBeTruthy();
    expect(formTitleBox).toBeTruthy();

    // Titles should not be excessively tall (indicating line breaks)
    expect(mainTitleBox!.height).toBeLessThan(60);
    expect(formTitleBox!.height).toBeLessThan(50);
  });

  test("form is centered on page", async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport) return;

    const container = page.locator(".max-w-md").first();
    const box = await container.boundingBox();

    if (box && viewport.width >= 768) {
      // Container should be roughly centered
      const leftMargin = box.x;
      const rightMargin = viewport.width - (box.x + box.width);

      // Left and right margins should be roughly equal (within 50px)
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(50);
    }
  });

  test("password toggle button works", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("••••••••");
    const toggleButton = page.locator("button[type='button']").filter({ has: page.locator("svg") });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("visual regression - desktop", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
      test.skip();
    }

    await expect(page).toHaveScreenshot("login-desktop.png", {
      maxDiffPixelRatio: 0.1,
    });
  });

  test("visual regression - mobile", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width > 500) {
      test.skip();
    }

    await expect(page).toHaveScreenshot("login-mobile.png", {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe("Login Functionality", () => {
  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("jan@example.com").fill("wrong@email.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    // Wait for error message
    await expect(page.locator(".bg-red-50, .bg-red-900\\/20")).toBeVisible({ timeout: 5000 });
  });

  test("navigates to register page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Zarejestruj się" }).click();

    await expect(page).toHaveURL("/register");
  });

  test("navigates to forgot password page", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Zapomniałem hasła").click();

    await expect(page).toHaveURL("/reset-password");
  });
});
