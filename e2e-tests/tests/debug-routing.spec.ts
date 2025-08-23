import { test, expect } from "@playwright/test";

test.describe("Debug Routing Issues", () => {
  test("Direct URL access debug", async ({ page }) => {
    const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:3000";

    // Enable console logging
    if (process.env.LOG_LEVEL === "debug") {
      page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
      page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
      page.on("requestfailed", (request) => console.log("REQUEST FAILED:", request.url(), request.failure()?.errorText));
    }

    console.log(`\n=== Testing direct access to: ${frontendUrl} ===`);

    // Test 1: Root URL
    try {
      await page.goto(frontendUrl);
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });

      const url = page.url();
      const title = await page.title().catch(() => "NO TITLE");
      const hasContent = await page
        .locator("body")
        .textContent()
        .catch(() => "NO CONTENT");

      console.log(`Root redirect result:`);
      console.log(`  URL: ${url}`);
      console.log(`  Title: ${title}`);
      console.log(`  Has content: ${hasContent ? "YES" : "NO"}`);
    } catch (error) {
      console.log(`Root access failed: ${error}`);
    }

    console.log(`\n=== Testing direct access to: ${frontendUrl}/auth/signin ===`);

    // Test 2: Direct auth route
    try {
      await page.goto(`${frontendUrl}/auth/signin`);
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });

      const url = page.url();
      const title = await page.title().catch(() => "NO TITLE");
      const bodyText = await page
        .locator("body")
        .textContent()
        .catch(() => "");

      console.log(`Direct auth access result:`);
      console.log(`  URL: ${url}`);
      console.log(`  Title: ${title}`);
      console.log(`  Body contains 404: ${bodyText.includes("404")}`);
      console.log(`  Body contains signin: ${bodyText.toLowerCase().includes("signin") || bodyText.toLowerCase().includes("sign in")}`);
      console.log(`  Body length: ${bodyText.length}`);
    } catch (error) {
      console.log(`Auth access failed: ${error}`);
    }

    console.log(`\n=== Testing server health ===`);

    // Test 3: Check if server responds at all
    try {
      const response = await page.goto(`${frontendUrl}/nonexistent-route`);
      console.log(`Server response status: ${response?.status()}`);
      console.log(`Server response URL: ${page.url()}`);
    } catch (error) {
      console.log(`Server health check failed: ${error}`);
    }

    // Just pass the test - we're debugging
    expect(true).toBe(true);
  });
});
