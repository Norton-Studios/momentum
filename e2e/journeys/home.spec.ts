import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Momentum - Developer Productivity Platform/);

  await expect(page.getByRole("heading", { name: /Turn Data into Developer/i })).toBeVisible();

  await expect(page.getByText("Everything You Need to Track Productivity")).toBeVisible();

  await expect(page.getByText("Start Free Trial")).toBeVisible();
  await expect(page.getByText("See How It Works")).toBeVisible();

  await expect(page.getByText("Metrics That Matter")).toBeVisible();
});
