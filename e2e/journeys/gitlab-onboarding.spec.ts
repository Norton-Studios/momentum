import { expect, test } from "@playwright/test";

const GITLAB_TOKEN = process.env.E2E_GITLAB_TOKEN;
const GITLAB_HOST = process.env.E2E_GITLAB_HOST;

test.describe
  .serial("GitLab Onboarding Journey", () => {
    test.beforeAll(() => {
      if (!GITLAB_TOKEN) {
        throw new Error("E2E_GITLAB_TOKEN environment variable must be set");
      }
    });

    test("Step 1: Create admin account via setup", async ({ page }) => {
      await page.goto("/setup");
      await expect(page).toHaveTitle(/Welcome - Momentum Setup/);

      await page.getByLabel("Organization Name").fill("GitLab Test Organization");
      await page.getByLabel("First Name").fill("GitLab");
      await page.getByLabel("Last Name").fill("Admin");
      await page.getByLabel("Email Address").fill("gitlab-admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");

      await page.getByRole("button", { name: "Create Admin Account" }).click();

      await expect(page).toHaveURL(/\/onboarding\/datasources/);
    });

    test("Step 2: Configure GitLab data source", async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("gitlab-admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      await page.getByRole("button", { name: /Configure GitLab/i }).click();
      await page.locator("#gitlab-GITLAB_TOKEN").waitFor({ state: "visible" });

      await page.locator("#gitlab-GITLAB_TOKEN").fill(GITLAB_TOKEN as string);
      if (GITLAB_HOST) {
        await page.locator("#gitlab-GITLAB_HOST").fill(GITLAB_HOST);
      }

      await page.getByRole("button", { name: "Test Connection" }).click();

      await expect(page.getByText("Connection successful!")).toBeVisible({
        timeout: 30000,
      });

      await page.getByRole("button", { name: "Save Configuration" }).click();

      await expect(page.locator("#gitlabStatus")).toHaveText("Connected");
    });

    test("Step 3: Continue to repository selection", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("gitlab-admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      await page.getByRole("button", { name: "Continue to Import" }).click();

      await expect(page).toHaveURL(/\/onboarding\/repositories/);
      await expect(page.getByRole("heading", { name: /Select Repositories/i })).toBeVisible();
    });

    test("Step 4: Select repositories and start import", async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("gitlab-admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/repositories");
      await page.waitForLoadState("networkidle");

      await page.waitForSelector('[data-testid="repository-item"]', {
        timeout: 30000,
      });

      const firstCheckbox = page.locator('[data-testid="repository-item"] input[type="checkbox"]').first();
      await firstCheckbox.check();

      await expect(page.getByText(/repositories selected/i)).toBeVisible();

      await page.getByRole("button", { name: /Continue/i }).click();

      await expect(page).toHaveURL(/\/onboarding\/importing/);
    });

    test("Step 5: Wait for import and complete onboarding", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("gitlab-admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/importing");
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: /Continue to Dashboard/i }).click();

      await expect(page).toHaveURL(/\/onboarding\/complete/);
      await expect(page.getByRole("heading", { name: /You're All Set/i })).toBeVisible();
    });

    test("Step 6: Navigate to dashboard", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("gitlab-admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/complete");
      await page.waitForLoadState("networkidle");

      await page.getByRole("link", { name: /Go to Dashboard/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
