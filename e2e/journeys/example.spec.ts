import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
	await page.goto("/");

	// Check that the page loads
	await expect(page).toHaveTitle(/React Router/);

	// Check for welcome content
	await expect(page.locator("h1")).toContainText("Welcome");
});
