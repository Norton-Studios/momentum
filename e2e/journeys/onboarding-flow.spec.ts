import { expect, test } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test("completes full onboarding flow from data sources to completion", async ({ page }) => {
    // Step 1: Navigate to data sources page
    await page.goto("/onboarding/datasources");
    await expect(page).toHaveTitle(/Momentum/);

    // Step 2: Configure GitHub data source
    await page.getByRole("button", { name: /github/i }).click();

    await page.getByLabel(/personal access token/i).fill("test_token_123");
    await page.getByLabel(/organization name/i).fill("test-org");

    // Note: In real tests, you'd mock the GitHub API
    // For now, we'll assume the test connection works
    await page.getByRole("button", { name: /save/i }).click();

    // Step 3: Navigate to repository selection
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/repositories/);

    // Step 4: Select repositories
    await expect(page.getByRole("heading", { name: /select repositories/i })).toBeVisible();

    // Wait for repositories to load
    await page.waitForSelector(".repository-item", { timeout: 10000 });

    // Select some repositories
    const firstCheckbox = page.locator(".repository-item input[type='checkbox']").first();
    await firstCheckbox.check();

    // Continue to import
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/importing/);

    // Step 5: Import progress page
    await expect(page.getByRole("heading", { name: /import started/i })).toBeVisible();

    // Continue to dashboard
    await page.getByRole("button", { name: /continue to dashboard/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/complete/);

    // Step 6: Completion page
    await expect(page.getByRole("heading", { name: /you're all set/i })).toBeVisible();
    await expect(page.getByText(/repositories tracked/i)).toBeVisible();

    // Go to dashboard
    await page.getByRole("link", { name: /go to dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("allows filtering repositories by activity", async ({ page }) => {
    await page.goto("/onboarding/repositories");

    // Wait for repositories to load
    await page.waitForSelector(".repository-item", { timeout: 10000 });

    // Change activity filter
    const activityFilter = page.locator(".filter-select");
    await activityFilter.selectOption("active");

    // Wait for results to update
    await page.waitForTimeout(500);

    // URL should reflect the filter
    await expect(page).toHaveURL(/activity=active/);
  });

  test("allows searching repositories", async ({ page }) => {
    await page.goto("/onboarding/repositories");

    // Wait for repositories to load
    await page.waitForSelector(".repository-item", { timeout: 10000 });

    // Search for a repository
    const searchInput = page.getByPlaceholder(/search repositories/i);
    await searchInput.fill("test");

    // Wait for debounce
    await page.waitForTimeout(500);

    // Results should be filtered (this would depend on actual data)
  });

  test("allows bulk selection of repositories", async ({ page }) => {
    await page.goto("/onboarding/repositories");

    // Wait for repositories to load
    await page.waitForSelector(".repository-item", { timeout: 10000 });

    // Click "Select All"
    await page.getByRole("button", { name: /^select all$/i }).click();

    // All visible checkboxes should be checked
    const checkboxes = page.locator(".repository-item input[type='checkbox']");
    const count = await checkboxes.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Click "Deselect All"
    await page.getByRole("button", { name: /deselect all/i }).click();

    // All checkboxes should be unchecked
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }
  });

  test("allows selecting active repositories", async ({ page }) => {
    await page.goto("/onboarding/repositories");

    // Wait for repositories to load
    await page.waitForSelector(".repository-item", { timeout: 10000 });

    // Click "Select Active"
    await page.getByRole("button", { name: /select active/i }).click();

    // Wait for the action to complete
    await page.waitForTimeout(500);

    // The selection count should update
    await expect(page.getByText(/repositories selected/i)).toBeVisible();
  });

  test("shows error when no VCS data source is configured", async ({ page }) => {
    // Try to access repositories page without configuring data source
    // This would require clearing the database first
    await page.goto("/onboarding/repositories");

    // Should redirect to datasources or show error
    await expect(page).toHaveURL(/\/onboarding\/datasources|error/);
  });

  test("can navigate back from each step", async ({ page }) => {
    // Start from repositories page
    await page.goto("/onboarding/repositories");
    await page.waitForSelector(".repository-item", { timeout: 10000 });

    // Click back button
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/datasources/);

    // Navigate forward again
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/repositories/);

    // Continue to importing
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/importing/);

    // Go back to repository selection
    await page.getByRole("link", { name: /back to repository selection/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/repositories/);
  });
});
