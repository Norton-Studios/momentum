import { expect, type Page, test } from "@playwright/test";

const GITHUB_TOKEN = process.env.E2E_GITHUB_TOKEN;
const GITHUB_ORG = process.env.E2E_GITHUB_ORG;
const JIRA_SERVER_URL = process.env.E2E_JIRA_SERVER_URL;
const JIRA_PAT = process.env.E2E_JIRA_PAT;

async function login(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("load");
  // Small delay to ensure React is hydrated
  await page.waitForTimeout(500);
  // Use JavaScript to set form values directly
  await page.evaluate(() => {
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;
    if (email) email.value = "admin@test.com";
    if (password) password.value = "TestPassword123!";
    // Trigger input events for React
    email?.dispatchEvent(new Event("input", { bubbles: true }));
    password?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}

test.describe
  .serial("Onboarding Journey", () => {
    test.beforeAll(() => {
      if (!GITHUB_TOKEN || !GITHUB_ORG) {
        throw new Error("E2E_GITHUB_TOKEN and E2E_GITHUB_ORG environment variables must be set");
      }
    });

    test("Step 1: Create admin account via setup", async ({ page }) => {
      await page.goto("/setup");
      await expect(page).toHaveTitle(/Welcome - Momentum Setup/);

      await page.getByLabel("Organization Name").fill("Test Organization");
      await page.getByLabel("First Name").fill("Test");
      await page.getByLabel("Last Name").fill("Admin");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");

      await page.getByRole("button", { name: "Create Admin Account" }).click();

      await expect(page).toHaveURL(/\/onboarding\/datasources/);
    });

    test("Step 2: Complete onboarding flow", async ({ page }, testInfo) => {
      testInfo.setTimeout(120000); // Extended timeout for full flow
      await login(page);

      // Configure GitHub data source
      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      await page.getByRole("button", { name: /Configure GitHub/i }).click();
      await page.locator("#github-GITHUB_TOKEN").waitFor({ state: "visible" });

      await page.locator("#github-GITHUB_TOKEN").fill(GITHUB_TOKEN as string);
      await page.locator("#github-GITHUB_ORG").fill(GITHUB_ORG as string);

      await page.getByRole("button", { name: "Test Connection" }).click();

      await expect(page.getByText("Connection successful!")).toBeVisible({
        timeout: 30000,
      });

      await page.getByRole("button", { name: "Save Configuration" }).click();

      await expect(page.locator("#githubStatus")).toHaveText("Connected");

      // Wait for repositories to load
      await page.waitForSelector('[data-testid="selectable-item"]', {
        timeout: 30000,
      });

      await expect(page.getByText(/repositories selected/i)).toBeVisible();

      // Toggle a repository if needed
      const firstCheckbox = page.locator('[data-testid="selectable-item"] input[type="checkbox"]').first();
      const isChecked = await firstCheckbox.isChecked();
      if (!isChecked) {
        await firstCheckbox.check();
      }

      // Continue to import
      await page.getByRole("button", { name: "Continue to Import" }).click();
      await expect(page).toHaveURL(/\/onboarding\/importing/);

      // Wait for import to start
      await expect(page.getByRole("heading", { name: "Import in Progress" })).toBeVisible({
        timeout: 30000,
      });

      // Continue to completion
      await page.getByRole("button", { name: /Continue to Dashboard/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/complete/, { timeout: 30000 });
      await expect(page.getByRole("heading", { name: /You're All Set/i })).toBeVisible();

      // Navigate to dashboard
      await page.getByRole("link", { name: /Go to Dashboard/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
