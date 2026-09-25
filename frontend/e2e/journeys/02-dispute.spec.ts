import { expect, test } from "@playwright/test";

import { ADMIN_BASE, login } from "../helpers";

/**
 * Cold-route compiles in the compose dev container (Next dev compiles each
 * route on first visit, 5–15s) make a full multi-account funnel exceed the
 * 30s global default — journeys get an explicit, documented ceiling.
 */
test.setTimeout(300_000);




/**
 * Dispute journey (brief §7) over seeded demo data: the student opens a
 * dispute on a seeded dispute-eligible order (completed within the BR-40
 * window, no existing dispute — the seed's third scenario order), with
 * evidence → owner resolves it in the Django admin (the audited service
 * path) → outcome refund_student_full lands.
 *
 * The workspace is client-rendered: each candidate order page must be waited
 * for (dispute-section testid) BEFORE deciding eligibility — the first CI
 * run raced the skeleton and skipped every eligible order.
 */
const STUDENT = { email: "student@demo.local", password: "demo-password-1234" };

test("dispute: open with evidence → owner resolves → refund outcome", async ({ page }) => {
  // --- student opens the dispute from the order workspace ---
  await login(page, STUDENT.email, STUDENT.password);

  await page.goto("/orders");
  const links = page.getByRole("link", { name: /ORD-/ });
  await links.first().waitFor({ state: "visible", timeout: 20_000 });
  const hrefs = await links.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href")).filter((href): href is string => !!href),
  );
  expect(hrefs.length, "seeded student should have orders").toBeGreaterThan(0);

  let found = false;
  for (const href of hrefs.slice(0, 6)) {
    await page.goto(href);
    const section = page.getByTestId("dispute-section");
    await section.waitFor({ state: "visible", timeout: 20_000 });
    // closed composer renders as the "Open a dispute" CTA (open-dispute-cta)
    if (await page.getByTestId("open-dispute-cta").isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }
  expect(found, "a dispute-eligible order should exist in the seeded data").toBe(true);

  await page.getByTestId("open-dispute-cta").click();
  await page.getByTestId("dispute-composer").waitFor({ state: "visible", timeout: 20_000 });
  await page.getByLabel("Reason").selectOption("deadline_missed");
  await page
    .getByLabel("What went wrong?")
    .fill("The delivery arrived after the agreed deadline and the material did not match the brief.");
  await page.getByLabel(/Evidence/).setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Open dispute", exact: true }).click();
  // dispute created → status card replaces the composer
  const statusCard = page.getByTestId("dispute-status");
  await expect(statusCard).toBeVisible({ timeout: 20_000 });
  await expect(statusCard.getByText(/open/i).first()).toBeVisible();

  // the dispute thread opens on demand from the status card
  await statusCard.getByRole("button", { name: "Open dispute thread" }).click();
  await page.waitForURL(/\/messages\//, { timeout: 20_000 });
  await expect(page.getByText(/dispute/i).first()).toBeVisible({ timeout: 20_000 });

  // --- owner (admin) resolves through the Django admin service form ---
  await page.goto(`${ADMIN_BASE}/admin/login/`);
  await page.locator("#id_username").fill("admin@demo.local");
  await page.locator("#id_password").fill("admin-demo-1234");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL(/\/admin\//, { timeout: 20_000 });
  await page.goto(`${ADMIN_BASE}/admin/disputes/dispute/?status__exact=open`);
  // resolution only runs from under_review (BR-41) — take the case first
  await page.locator("#action-toggle").check();
  await page.locator("select[name=action]").selectOption({ label: "Take case (open → under_review)" });
  await page.getByRole("button", { name: /go/i }).click();
  // the bulk action re-renders the changelist; the open filter is now empty
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#result_list tbody a")).toHaveCount(0, { timeout: 20_000 });
  await page.goto(`${ADMIN_BASE}/admin/disputes/dispute/?status__exact=under_review`);
  await page.locator("#result_list tbody a").first().click();
  await page.locator("#outcome").selectOption("refund_student_full");
  await page
    .locator("#resolution_notes")
    .fill("Deadline was missed and evidence confirms it; refunding the student in full.");
  await page.getByRole("button", { name: /execute resolution/i }).click();
  await expect(page.locator(".messagelist")).toContainText(/resolved/i, { timeout: 20_000 });
});
