import { expect, test } from "@playwright/test";

/**
 * Phase 1 smoke: the public home page renders and shows a backend status.
 * Runs against `docker compose up` (see README) or any dev stack on :3000.
 */
test("home page renders with backend status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Learn faster");
  await expect(page.getByTestId("api-status")).toHaveText(/LIVE|UNREACHABLE/);
});

test("how-it-works page is reachable", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How it works");
});
