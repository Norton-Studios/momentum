import { test, expect } from "@playwright/test";

test.describe("Simple Smoke Tests", () => {
  test("Home page loads and redirects correctly", async ({ page }) => {
    const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:3000";

    // Go to the home page
    await page.goto(frontendUrl);
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Just check that we get some response (not a complete failure)
    const title = await page.title();
    console.log(`Page title: "${title}"`);

    const url = page.url();
    console.log(`Final URL: "${url}"`);

    // Very basic check - should not be empty or error page
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).not.toContain("error");
  });

  test("Sign-in route is accessible", async ({ page }) => {
    const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:3000";

    // Go directly to sign-in
    await page.goto(`${frontendUrl}/auth/signin`);
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    const title = await page.title();
    const url = page.url();
    const bodyText = await page.textContent("body");

    console.log(`Sign-in page title: "${title}"`);
    console.log(`Sign-in URL: "${url}"`);
    console.log(`Body contains: ${bodyText?.substring(0, 200)}...`);

    // Should have proper title and contain sign-in content
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(bodyText?.toLowerCase()).toContain("sign in");
    expect(bodyText?.toLowerCase()).toContain("email");
    expect(bodyText?.toLowerCase()).toContain("password");
  });

  test("Sign-up route is accessible", async ({ page }) => {
    const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:3000";

    // Go directly to sign-up
    await page.goto(`${frontendUrl}/auth/signup`);
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    const title = await page.title();
    const url = page.url();
    const bodyText = await page.textContent("body");

    console.log(`Sign-up page title: "${title}"`);
    console.log(`Sign-up URL: "${url}"`);
    console.log(`Body contains: ${bodyText?.substring(0, 200)}...`);

    // Should have proper title and contain sign-up content
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(bodyText?.toLowerCase()).toContain("create your account");
    expect(bodyText?.toLowerCase()).toContain("organization name");
    expect(bodyText?.toLowerCase()).toContain("email");
  });
});
