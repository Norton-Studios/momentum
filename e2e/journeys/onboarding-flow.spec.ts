import { expect, test } from "@playwright/test";

const GITHUB_TOKEN = process.env.E2E_GITHUB_TOKEN;
const GITHUB_ORG = process.env.E2E_GITHUB_ORG;

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

    test("Step 2: Configure GitHub data source", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.goto("/onboarding/datasources");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      await page.getByRole("button", { name: /Configure GitHub/i }).click();

      await page.locator("#github-GITHUB_TOKEN").fill(GITHUB_TOKEN as string);
      await page.locator("#github-GITHUB_ORG").fill(GITHUB_ORG as string);

      await page.getByRole("button", { name: "Test Connection" }).click();

      await expect(page.getByText("Connection successful!")).toBeVisible({
        timeout: 30000,
      });

      await page.getByRole("button", { name: "Save Configuration" }).click();

      await expect(page.locator("#githubStatus")).toHaveText("Connected");
    });

    test("Step 3: Continue to repository selection", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.goto("/onboarding/datasources");

      await page.getByRole("button", { name: "Continue to Import" }).click();

      await expect(page).toHaveURL(/\/onboarding\/repositories/);
      await expect(page.getByRole("heading", { name: /Select Repositories/i })).toBeVisible();
    });

    test("Step 4: Select repositories and start import", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.goto("/onboarding/repositories");

      await page.waitForSelector('[data-testid="repository-item"]', {
        timeout: 30000,
      });

      const firstCheckbox = page.locator('[data-testid="repository-item"] input[type="checkbox"]').first();
      await firstCheckbox.check();

      await expect(page.getByText(/1 repositor/i)).toBeVisible();

      await page.getByRole("button", { name: /Continue/i }).click();

      await expect(page).toHaveURL(/\/onboarding\/importing/);
    });

    test("Step 5: Wait for import and complete onboarding", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.goto("/onboarding/importing");

      await page.getByRole("button", { name: /Continue to Dashboard/i }).click();

      await expect(page).toHaveURL(/\/onboarding\/complete/);
      await expect(page.getByRole("heading", { name: /You're All Set/i })).toBeVisible();
    });

    test("Step 6: Navigate to dashboard", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.goto("/onboarding/complete");

      await page.getByRole("link", { name: /Go to Dashboard/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
