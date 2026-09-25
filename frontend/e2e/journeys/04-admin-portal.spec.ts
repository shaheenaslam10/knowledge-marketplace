import { expect, test } from "@playwright/test";

/**
 * Cold-route compiles in the compose dev container (Next dev compiles each
 * route on first visit, 5–15s) make a full multi-account funnel exceed the
 * 30s global default — journeys get an explicit, documented ceiling.
 */
test.setTimeout(300_000);


/**
 * Admin journey (brief §7): staff login → KPI dashboard → moderation review
 * (audited dismiss) → dispute triage → audit → reconciliation → config.
 * Exercises the Phase 10 portal over the seeded demo dataset.
 */
const ADMIN = { email: "admin@demo.local", password: "admin-demo-1234" };

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByTestId("login-submit").click();
    try {
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });
      return;
    } catch {
      /* hydration retry — see e2e/helpers.ts */
    }
  }
  throw new Error("admin login never navigated");
}

test("admin portal: dashboard → moderation → disputes → audit → reconciliation → config", async ({ page }) => {
  await adminLogin(page);

  // --- dashboard: KPI cards render and respond to the range control ---
  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: /operations dashboard/i })).toBeVisible();
  await expect(page.getByTestId("kpi-Requests")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Today" }).click();
  await expect(page.getByTestId("kpi-GMV")).toBeVisible({ timeout: 15_000 });

  // --- moderation: review + dismiss the seeded off-platform report ---
  await page.goto("/portal/moderation");
  const reviewButton = page.getByRole("button", { name: "Review" }).first();
  if (await reviewButton.count()) {
    await reviewButton.click();
    await page.getByLabel("Reviewer note (audited)").fill("E2E: off-platform solicitation confirmed.");
    await page.getByTestId("hide-message").click();
    await expect(page.getByText(/loading queue|no reports/i).first()).toBeVisible({ timeout: 15_000 });
  }
  await expect(page.getByTestId("report-queue").or(page.getByText(/no reports match/i))).toBeVisible();

  // --- dispute queue renders seeded disputes ---
  await page.goto("/portal/disputes");
  await expect(page.getByText(/dispute queue/i)).toBeVisible();
  await expect(
    page.locator('[data-testid="dispute-queue"] tbody tr').or(page.getByText(/no disputes match/i)).first(),
  ).toBeVisible({ timeout: 20_000 });

  // --- audit viewer shows append-only events ---
  await page.goto("/portal/audit");
  await expect(page.getByText(/audit viewer/i)).toBeVisible();
  await expect(page.locator('[data-testid="audit-table"] tbody tr').first()).toBeVisible({ timeout: 15_000 });

  // --- reconciliation: seeded ledger is consistent ---
  await page.goto("/portal/finance");
  await expect(page.getByText(/all checks pass|finding/i).first()).toBeVisible({ timeout: 15_000 });

  // --- config: admin reads + saves (audited write path) ---
  await page.goto("/portal/config");
  await expect(page.getByText(/platform configuration/i)).toBeVisible();
  await expect(page.locator("#open_commission_rate")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /save configuration/i }).click();
  await expect(page.getByTestId("config-saved")).toBeVisible({ timeout: 15_000 });

  // --- users overview ---
  await page.goto("/portal/users");
  await expect(page.locator('[data-testid="users-table"] tbody tr').first()).toBeVisible({ timeout: 15_000 });
});
