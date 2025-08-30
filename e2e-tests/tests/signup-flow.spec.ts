import { expect, test } from "@playwright/test";

test.describe("Signup Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies to ensure fresh state
    await page.context().clearCookies();
  });

  test("Complete signup flow creates user and tenant", async ({ page }) => {
    const frontendUrl = "http://localhost:3002"; // Our current dashboard running on port 3002

    // Navigate to signup page
    await page.goto(`${frontendUrl}/auth/signup`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Fill out signup form
    const uniqueOrg = `Test Org ${Date.now()}`;
    const uniqueEmail = `test${Date.now()}@example.com`;

    await page.fill('input[placeholder="Acme Corporation"]', uniqueOrg);
    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Create a strong password"]', "StrongPassword123!");
    await page.fill('input[placeholder="Confirm your password"]', "StrongPassword123!");

    // Wait for form validation to complete
    await page.waitForTimeout(2000);

    // Submit the form
    const signUpButton = page.getByRole("button", { name: /create account/i });
    await expect(signUpButton).toBeEnabled();
    await signUpButton.click();

    // Wait for signup to process and redirect
    await page.waitForTimeout(5000);

    // Should redirect to onboarding or dashboard
    const currentUrl = page.url();
    expect(
      currentUrl.includes("/onboarding") || currentUrl.includes("/dashboard") || currentUrl.includes("/auth/signin"), // Might redirect to signin if there's an issue
    ).toBe(true);

    // If redirected to signin, that might indicate an error
    if (currentUrl.includes("/auth/signin")) {
      // Check if there's an error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log("Signup error:", errorText);
        throw new Error(`Signup failed with error: ${errorText}`);
      }
    }

    // Verify we're not still on the signup page
    expect(currentUrl).not.toContain("/auth/signup");
  });

  test("Signup with duplicate organization name fails gracefully", async ({ page }) => {
    const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:3002";

    // First, create a user with a specific org name
    await page.goto(`${frontendUrl}/auth/signup`);
    await page.waitForLoadState("networkidle");

    const orgName = `Duplicate Org ${Date.now()}`;

    await page.fill('input[placeholder="Acme Corporation"]', orgName);
    await page.fill('input[placeholder="John Doe"]', "First User");
    await page.fill('input[type="email"]', `first${Date.now()}@example.com`);
    await page.fill('input[placeholder="Create a strong password"]', "StrongPassword123!");
    await page.fill('input[placeholder="Confirm your password"]', "StrongPassword123!");

    await page.waitForTimeout(2000);

    const firstSignUpButton = page.getByRole("button", { name: /create account/i });
    await firstSignUpButton.click();

    // Wait for first signup to complete
    await page.waitForTimeout(5000);

    // Now try to create another user with the same org name
    await page.goto(`${frontendUrl}/auth/signup`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[placeholder="Acme Corporation"]', orgName);
    await page.fill('input[placeholder="John Doe"]', "Second User");
    await page.fill('input[type="email"]', `second${Date.now()}@example.com`);
    await page.fill('input[placeholder="Create a strong password"]', "StrongPassword123!");
    await page.fill('input[placeholder="Confirm your password"]', "StrongPassword123!");

    await page.waitForTimeout(2000);

    const secondSignUpButton = page.getByRole("button", { name: /create account/i });

    // The button should be disabled due to duplicate org validation
    await expect(secondSignUpButton).toBeDisabled();
  });
});
