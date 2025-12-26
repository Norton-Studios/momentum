import { expect, type Page, test } from "@playwright/test";

const GITHUB_TOKEN = process.env.E2E_GITHUB_TOKEN;
const GITHUB_ORG = process.env.E2E_GITHUB_ORG;
const SONAR_TOKEN = process.env.E2E_SONAR_TOKEN;
const SONAR_ORG = process.env.E2E_SONAR_ORG;

async function login(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill("admin@test.com");
  await page.locator("#password").fill("TestPassword123!");
  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from login page
  // Login redirects to "/" which then redirects based on state
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

test.describe
  .serial("Onboarding Journey", () => {
    // Disable retries for serial tests - retrying from the beginning with
    // existing database state doesn't work since Step 1 creates the admin user
    test.describe.configure({ retries: 0 });

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

      await expect(page).toHaveURL(/\/onboarding\/data-sources/);
    });

    test("Step 2: Complete onboarding flow", async ({ page }, testInfo) => {
      testInfo.setTimeout(120000); // Extended timeout for full flow
      await login(page);

      // Configure GitHub data source
      await page.goto("/onboarding/data-sources");
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
    });

    test("Step 7: Navigate to settings and edit organization details", async ({ page }) => {
      await login(page);

      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveTitle(/General Settings - Momentum/);
      await expect(page.getByRole("heading", { name: "Organization Details" })).toBeVisible();

      // Verify tabs are visible
      await expect(page.getByRole("link", { name: "General" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Teams" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Data Sources" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Imports" })).toBeVisible();

      // Edit organization details
      await page.getByLabel("Display Name").fill("Test Org Display");
      await page.getByLabel("Description").fill("A test organization for e2e testing");
      await page.getByLabel("Website").fill("https://test-org.example.com");

      await page.getByRole("button", { name: "Save Changes" }).click();

      await expect(page.getByText("Organization details updated successfully")).toBeVisible();
    });

    test("Step 8: Create and manage a team", async ({ page }) => {
      await login(page);

      await page.goto("/settings/teams");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveTitle(/Teams - Settings - Momentum/);
      await expect(page.getByRole("heading", { name: "Teams", exact: true })).toBeVisible();

      // Create a new team
      await page.getByRole("button", { name: "Create Team" }).click();

      await expect(page.getByRole("heading", { name: "Create New Team" })).toBeVisible();

      await page.getByLabel("Team Name").fill("E2E Test Team");
      await page.getByLabel("Description").fill("Team created during e2e testing");

      await page.getByRole("button", { name: "Create Team" }).last().click();

      // Verify team appears in the table
      await expect(page.getByText("E2E Test Team")).toBeVisible();
      await expect(page.getByText("Team created during e2e testing")).toBeVisible();

      // Click on the team to view details
      await page.getByRole("link", { name: "E2E Test Team" }).click();

      await expect(page).toHaveURL(/\/settings\/teams\//);
      await expect(page.getByRole("heading", { name: "E2E Test Team" })).toBeVisible();

      // Verify repository and project sections are visible
      await expect(page.getByText(/Repositories \(\d+\)/)).toBeVisible();
      await expect(page.getByText(/Projects \(\d+\)/)).toBeVisible();
    });

    test("Step 9: View and verify data sources configuration", async ({ page }) => {
      await login(page);

      await page.goto("/settings/data-sources");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveTitle(/Data Sources - Settings - Momentum/);

      // Verify section headers are visible
      await expect(page.getByText("Version Control")).toBeVisible();
      await expect(page.getByText("CI/CD Platforms")).toBeVisible();

      // Verify GitHub data source card is visible and connected from onboarding
      await expect(page.getByRole("heading", { name: "GitHub" })).toBeVisible();
      await expect(page.getByText("Connected").first()).toBeVisible();

      // Verify configure buttons are present
      await expect(page.getByRole("button", { name: "Edit GitHub Configuration" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Configure GitLab" })).toBeVisible();
    });

    test("Step 10: Configure SonarCloud data source", async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);

      // Skip if SonarCloud credentials not configured
      if (!SONAR_TOKEN || !SONAR_ORG) {
        test.skip();
        return;
      }

      await login(page);

      await page.goto("/settings/data-sources");
      await page.waitForLoadState("networkidle");

      // Click Configure SonarQube button
      await page.getByRole("button", { name: "Configure SonarQube" }).click();

      // Wait for the configuration form to appear
      await page.locator("#sonarqube-SONARQUBE_VARIANT").waitFor({ state: "visible" });

      // Select SonarCloud variant
      await page.locator("#sonarqube-SONARQUBE_VARIANT").selectOption("cloud");

      // Fill in SonarCloud credentials
      await page.locator("#sonarqube-SONARQUBE_ORGANIZATION").fill(SONAR_ORG);
      await page.locator("#sonarqube-SONARQUBE_TOKEN_CLOUD").fill(SONAR_TOKEN);

      // Test connection
      await page.getByRole("button", { name: "Test Connection" }).click();

      await expect(page.getByText("Connection successful!")).toBeVisible({
        timeout: 30000,
      });

      // Save configuration
      await page.getByRole("button", { name: "Save Configuration" }).click();

      // Verify SonarQube shows as connected
      await expect(page.locator("#sonarqubeStatus")).toHaveText("Connected");
    });

    test("Step 11: View imports and trigger manual import", async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);

      await login(page);

      await page.goto("/settings/imports");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveTitle(/Import Settings - Momentum/);
      await expect(page.getByRole("heading", { name: "Data Imports" })).toBeVisible();

      // Check if import history section exists
      await expect(page.getByRole("heading", { name: "Import History" })).toBeVisible();

      // If no import is running, start one
      const startButton = page.getByRole("button", { name: "Start Import" });
      const isIdle = await startButton.isVisible().catch(() => false);

      if (isIdle) {
        await startButton.click();

        // Wait for import to start
        await expect(page.getByText("Import in Progress")).toBeVisible({
          timeout: 10000,
        });
      } else {
        // Import is already running, verify the running state
        await expect(page.getByText("Import in Progress")).toBeVisible();
      }

      // Verify batch information is displayed
      await expect(page.getByText(/Batch ID:/)).toBeVisible();
    });

    test("Step 12: Delete the test team", async ({ page }) => {
      await login(page);

      await page.goto("/settings/teams");
      await page.waitForLoadState("networkidle");

      // Find the E2E Test Team row and delete it
      const teamRow = page.getByRole("row").filter({ hasText: "E2E Test Team" });
      await teamRow.getByRole("button", { name: "Delete" }).click();

      // Confirm deletion
      await teamRow.getByRole("button", { name: "Yes" }).click();

      // Verify team is removed
      await expect(page.getByText("E2E Test Team")).not.toBeVisible();
    });
  });
