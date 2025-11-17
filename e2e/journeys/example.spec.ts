import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");

  // Check that the page loads with correct title
  await expect(page).toHaveTitle(/Momentum/);

  // Check for main heading
  await expect(page.getByRole("heading", { name: "Momentum" })).toBeVisible();

  // Check for description text
  await expect(page.getByText("Developer productivity analytics")).toBeVisible();
});
