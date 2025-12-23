import { expect, test } from "@playwright/test";

const GITHUB_TOKEN = process.env.E2E_GITHUB_TOKEN;
const GITHUB_ORG = process.env.E2E_GITHUB_ORG;
const JIRA_SERVER_URL = process.env.E2E_JIRA_SERVER_URL;
const JIRA_PAT = process.env.E2E_JIRA_PAT;

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

    test("Step 2: Configure GitHub data source and select repositories", async ({ page }, testInfo) => {
      testInfo.setTimeout(90000); // Extended timeout for GitHub API calls
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

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

      // Repository section should auto-expand after successful connection
      // Wait for repositories to load
      await page.waitForSelector('[data-testid="selectable-item"]', {
        timeout: 30000,
      });

      // Verify repository selection UI is visible
      await expect(page.getByText(/repositories selected/i)).toBeVisible();

      // Toggle a repository if needed (repos may be pre-selected based on activity)
      const firstCheckbox = page.locator('[data-testid="selectable-item"] input[type="checkbox"]').first();
      const isChecked = await firstCheckbox.isChecked();
      if (!isChecked) {
        await firstCheckbox.check();
      }
    });

    test("Step 3: Configure Jira Data Center (optional)", async ({ page }, testInfo) => {
      test.skip(!JIRA_SERVER_URL || !JIRA_PAT, "Jira credentials not configured");

      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      // Click Configure Jira
      await page.getByRole("button", { name: /Configure Jira/i }).click();

      // Wait for the form to be visible and select Data Center variant
      await page.locator("#jira-JIRA_VARIANT").waitFor({ state: "visible" });
      await page.locator("#jira-JIRA_VARIANT").selectOption("datacenter");

      // Wait for Data Center specific fields and fill credentials
      await page.locator("#jira-JIRA_SERVER_URL").waitFor({ state: "visible" });
      await page.locator("#jira-JIRA_SERVER_URL").fill(JIRA_SERVER_URL as string);
      await page.locator("#jira-JIRA_PAT").fill(JIRA_PAT as string);

      // Test connection
      await page.getByRole("button", { name: "Test Connection" }).click();
      await expect(page.getByText("Connection successful!")).toBeVisible({
        timeout: 30000,
      });

      // Save configuration
      await page.getByRole("button", { name: "Save Configuration" }).click();
      await expect(page.locator("#jiraStatus")).toHaveText("Connected");

      // Projects section should auto-expand - wait for projects to load
      await page.waitForSelector("[data-testid='selectable-item']", { timeout: 30000 });
      await expect(page.getByText(/projects selected/i)).toBeVisible();

      // Toggle a project if needed
      const firstProjectCheckbox = page.locator("[data-testid='selectable-item'] input[type='checkbox']").first();
      const isProjectChecked = await firstProjectCheckbox.isChecked();
      if (!isProjectChecked) {
        await firstProjectCheckbox.check();
      }
    });

    test("Step 4: Continue to import", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);
      await page.waitForLoadState("networkidle");

      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      await page.getByRole("button", { name: "Continue to Import" }).click();

      await expect(page).toHaveURL(/\/onboarding\/importing/);
    });

    test("Step 5: Wait for import and complete onboarding", async ({ page }, testInfo) => {
      testInfo.setTimeout(60000); // Extended timeout for import auto-start
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);
      await page.waitForLoadState("networkidle");

      await page.goto("/onboarding/importing");
      await page.waitForLoadState("networkidle");

      // Import starts automatically - verify heading shows import is in progress
      await expect(page.getByRole("heading", { name: "Import in Progress" })).toBeVisible({
        timeout: 30000,
      });

      await page.getByRole("button", { name: /Continue to Dashboard/i }).click();

      await expect(page).toHaveURL(/\/onboarding\/complete/, { timeout: 30000 });
      await expect(page.getByRole("heading", { name: /You're All Set/i })).toBeVisible();
    });

    test("Step 6: Navigate to dashboard", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);
      await page.waitForLoadState("networkidle");

      await page.goto("/onboarding/complete");
      await page.waitForLoadState("networkidle");

      await page.getByRole("link", { name: /Go to Dashboard/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
