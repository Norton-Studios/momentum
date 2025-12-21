import { expect, test } from "@playwright/test";

const JIRA_SERVER_URL = process.env.E2E_JIRA_SERVER_URL;
const JIRA_PAT = process.env.E2E_JIRA_PAT;

test.describe
  .serial("Jira Data Center Onboarding", () => {
    test.beforeAll(() => {
      if (!JIRA_SERVER_URL || !JIRA_PAT) {
        throw new Error("E2E_JIRA_SERVER_URL and E2E_JIRA_PAT environment variables must be set");
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

    test("Step 2: Configure Jira Data Center and select projects", async ({ page }, testInfo) => {
      testInfo.setTimeout(90000);
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      // Scroll to Project Management section and click Configure Jira
      await page.getByRole("button", { name: /Configure Jira/i }).click();

      // Wait for the form to be visible
      await page.locator("#jira-JIRA_VARIANT").waitFor({ state: "visible" });

      // Select Data Center variant
      await page.locator("#jira-JIRA_VARIANT").selectOption("datacenter");

      // Wait for Data Center specific fields to appear
      await page.locator("#jira-JIRA_SERVER_URL").waitFor({ state: "visible" });

      // Fill in Data Center credentials
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

      // Projects section should auto-expand after successful connection
      // Wait for projects to load
      await page.waitForSelector(".repository-item", {
        timeout: 30000,
      });

      // Verify project selection UI is visible
      await expect(page.getByText(/projects selected/i)).toBeVisible();

      // Toggle a project if needed
      const firstCheckbox = page.locator(".repository-item input[type='checkbox']").first();
      const isChecked = await firstCheckbox.isChecked();
      if (!isChecked) {
        await firstCheckbox.check();
      }
    });

    test("Step 3: Continue to import", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email Address").fill("admin@test.com");
      await page.getByLabel("Password").fill("TestPassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/);

      await page.goto("/onboarding/datasources");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Connect Your Tools" })).toBeVisible();

      // Jira is not a required connection, but we can still continue
      // First, we need a VCS connection. For this test, we'll skip to import
      // by checking if continue button is enabled (requires VCS) or use skip
      const continueButton = page.getByRole("button", { name: "Continue to Import" });
      const isDisabled = await continueButton.isDisabled();

      if (isDisabled) {
        // No VCS connected, use skip link
        await page.getByRole("link", { name: "Skip for now" }).click();
      } else {
        await continueButton.click();
      }

      await expect(page).toHaveURL(/\/(dashboard|onboarding\/importing)/);
    });
  });
