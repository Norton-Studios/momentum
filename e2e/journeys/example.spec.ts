import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");

  // Check that the page loads with correct title
  await expect(page).toHaveTitle(/New React Router App/);

  // Check for React Router logo (use first() since there are light/dark variants)
  await expect(page.getByAltText("React Router").first()).toBeVisible();

  // Check for welcome content
  await expect(page.getByText("What's next?")).toBeVisible();

  // Check for documentation link
  await expect(page.getByRole("link", { name: /React Router Docs/i })).toBeVisible();
});
