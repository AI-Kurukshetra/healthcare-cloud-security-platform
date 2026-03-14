import { test, expect } from "@playwright/test";

test("home page renders scaffold copy", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /healthcare product foundation/i })).toBeVisible();
});
