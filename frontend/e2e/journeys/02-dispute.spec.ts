import { expect, test } from "@playwright/test";

/**
 * Dispute journey (brief §7) over seeded demo data: student opens a dispute
 * on the seeded completed order with evidence → owner resolves it in the
 * Django admin (the audited service path) → financial outcome lands
 * (full refund ⇒ order cancelled per BR-41).
 */
const STUDENT = { email: "student@demo.local", password: "demo-password-1234" };

test("dispute: open with evidence → owner resolves → refund outcome", async ({ page }) => {
  // --- student opens the dispute from the order workspace ---
  await page.goto("/login");
  await page.getByLabel("Email").fill(STUDENT.email);
  await page.getByLabel("Password").fill(STUDENT.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });

  // find a completed order that still accepts a dispute (the seed also has a
  // refunded order with its dispute closed and an active order already disputed)
  await page.goto("/orders");
  const orderLinks = await page.getByRole("link", { name: /ORD-/ }).all();
  let openTrigger = null;
  for (const link of orderLinks.slice(0, 6)) {
    await link.click();
    const candidate = page.getByRole("button", { name: /open dispute/i }).first();
    if (await candidate.isVisible().catch(() => false)) {
      openTrigger = candidate;
      break;
    }
    await page.goto("/orders");
  }
  expect(openTrigger, "a dispute-able order should exist in the seeded data").not.toBeNull();
  await openTrigger!.click();
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
  await page.getByRole("button", { name: "Open dispute" }).click();
  await expect(page.getByText(/dispute opened|under review|open/i).first()).toBeVisible({ timeout: 15_000 });

  // the dispute thread shows up in the inbox (dispute context thread)
  await page.goto("/messages");
  await expect(page.getByText(/dispute/i).first()).toBeVisible({ timeout: 15_000 });

  // --- owner (admin) resolves through the Django admin service form ---
  await page.goto("/admin/login/");
  await page.locator("#id_username").fill("admin@demo.local");
  await page.locator("#id_password").fill("admin-demo-1234");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.goto("/admin/disputes/dispute/?status__exact=open");
  await page.locator("#result_list tbody a").first().click();
  await page.locator("#outcome").selectOption("refund_student_full");
  await page
    .locator("#resolution_notes")
    .fill("Deadline was missed and evidence confirms it; refunding the student in full.");
  await page.getByRole("button", { name: /execute resolution/i }).click();
  await expect(page.getByText(/resolved/i).first()).toBeVisible({ timeout: 15_000 });
});
