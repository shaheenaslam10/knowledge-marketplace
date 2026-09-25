import { expect, test } from "@playwright/test";

import { ADMIN_BASE, login, register, verifyEmail } from "../helpers";

/**
 * Cold-route compiles in the compose dev container (Next dev compiles each
 * route on first visit, 5–15s) make a full multi-account funnel exceed the
 * 30s global default — journeys get an explicit, documented ceiling.
 */
test.setTimeout(300_000);

/**
 * Dispute journey (brief §7) — SELF-SUFFICIENT: it builds its own completed
 * order (fresh student + the seeded approved expert) and then disputes it.
 * Seeded dispute-eligible orders are NOT used because CI retries (retries: 1)
 * re-run the whole test: attempt 1's dispute would make every retry find no
 * eligible seeded order.
 *
 * Flow: request → offer (BR-15) → select → pay (dev confirm) → deliver →
 * approve → completed → dispute with evidence → dispute thread → admin takes
 * the case (open → under_review) → BR-41 resolution refund_student_full
 * through the audited admin service form.
 */
const EXPERT = { email: "expert@demo.local", password: "demo-password-1234" };

test("dispute: build order → open with evidence → owner resolves → refund outcome", async ({ browser }) => {
  // identities are generated INSIDE the test callback — CI retries must not
  // reuse emails/titles from a failed attempt
  const stamp = Date.now();
  const studentEmail = `e2e-dispute-student-${stamp}@demo.local`;
  const requestTitle = `E2E dispute coaching ${stamp}`;

  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();

  // --- student: register → verify → publish an open request ---
  await register(student, "E2E Dispute Student", studentEmail);
  await verifyEmail(student, studentEmail);
  await student.goto("/requests/new");
  await student.locator("#subject option").nth(1).waitFor({ state: "attached", timeout: 20_000 });
  await student.getByLabel("Title").fill(requestTitle);
  await student.getByLabel("Type of help").selectOption("tutoring");
  await student.getByLabel("Subject").selectOption({ index: 1 });
  await student
    .getByLabel("What do you want to achieve?")
    .fill("Exam-focused statistics coaching; two sessions before the midterm.");
  await student.getByLabel("Budget max").fill("70");
  await student.getByRole("button", { name: "Publish request" }).click();
  await student.waitForURL(/\/requests\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(student.getByText("Receiving offers")).toBeVisible({ timeout: 20_000 });

  // --- seeded approved expert offers (BR-15: one binding offer per request) ---
  const expertContext = await browser.newContext();
  const expert = await expertContext.newPage();
  await login(expert, EXPERT.email, EXPERT.password);
  await expert.goto("/opportunities");
  // scope to OUR request — the feed may also list seeded open requests
  await expert.getByLabel("Search").fill(requestTitle);
  await expert.getByRole("button", { name: "Filter" }).click();
  await expert.getByRole("link", { name: "View & offer" }).first().click();
  await expert.waitForURL(/\/opportunities\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expert.getByLabel("Your price").fill("60");
  await expert.getByLabel("Proposed schedule").fill("Two sessions this week, evenings.");
  await expert
    .getByLabel("Your plan")
    .fill("Guided practice on distributions and hypothesis tests with worked exam questions.");
  await expert.getByRole("button", { name: "Send offer" }).click();
  await expect(expert.getByRole("button", { name: "Update offer" })).toBeVisible({ timeout: 20_000 });

  // --- student selects the offer → order → pays (manual gateway + dev confirm) ---
  await student.goto("/requests");
  await student.getByRole("link", { name: "Open", exact: true }).first().click();
  await student.getByRole("button", { name: "Select expert" }).click();
  await expect(student.getByText(/expert selected/i).first()).toBeVisible({ timeout: 20_000 });
  await student.goto("/orders");
  await student.getByRole("link", { name: /ORD-/ }).first().click();
  await student.getByRole("button", { name: "Pay now" }).click();
  await student.getByRole("button", { name: "Confirm payment (dev)" }).click();
  await expect(student.getByText("In progress").first()).toBeVisible({ timeout: 20_000 });

  // --- expert delivers → student approves → completed (dispute-eligible) ---
  await expert.goto("/orders");
  await expert.getByRole("link", { name: /ORD-/ }).first().click();
  await expert.getByRole("button", { name: /deliver/i }).first().click();
  await expert
    .getByLabel("Delivery summary")
    .fill("Delivered the session plan with worked examples and a practice set.");
  await expert.locator("form").getByRole("button", { name: "Submit delivery" }).click();
  await expect(expert.getByText(/delivered/i).first()).toBeVisible({ timeout: 20_000 });
  await student.reload();
  await student.getByRole("button", { name: "Approve delivery" }).click();
  await expect(student.getByText(/completed/i).first()).toBeVisible({ timeout: 20_000 });

  // --- student opens a dispute with evidence (BR-40: window starts at completion) ---
  await student.getByTestId("open-dispute-cta").click();
  await student.getByTestId("dispute-composer").waitFor({ state: "visible", timeout: 20_000 });
  await student.getByLabel("Reason").selectOption("deadline_missed");
  await student
    .getByLabel("What went wrong?")
    .fill("The delivery arrived after the agreed deadline and the material did not match the brief.");
  await student.getByLabel(/Evidence/).setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await student.getByRole("button", { name: "Open dispute", exact: true }).click();
  // dispute created → status card replaces the composer
  const statusCard = student.getByTestId("dispute-status");
  await expect(statusCard).toBeVisible({ timeout: 20_000 });
  await expect(statusCard.getByText(/open/i).first()).toBeVisible();

  // the dispute thread opens on demand from the status card
  await statusCard.getByRole("button", { name: "Open dispute thread" }).click();
  await student.waitForURL(/\/messages\//, { timeout: 20_000 });
  await expect(student.getByText(/dispute/i).first()).toBeVisible({ timeout: 20_000 });

  // --- owner (admin) resolves through the Django admin service form ---
  await student.goto(`${ADMIN_BASE}/admin/login/`);
  await student.locator("#id_username").fill("admin@demo.local");
  await student.locator("#id_password").fill("admin-demo-1234");
  await student.getByRole("button", { name: /log in/i }).click();
  await student.waitForURL(/\/admin\//, { timeout: 20_000 });
  // scope to OUR dispute via its (unique) description so seeded open disputes
  // never leak into this flow; the token is distinctive enough for icontains
  const disputeQuery = encodeURIComponent("material did not match the brief");
  await student.goto(`${ADMIN_BASE}/admin/disputes/dispute/?status__exact=open&q=${disputeQuery}`);
  // resolution only runs from under_review (BR-41) — take the case first
  await student.locator("#action-toggle").check();
  await student.locator("select[name=action]").selectOption({ label: "Take case (open → under_review)" });
  await student.getByRole("button", { name: /go/i }).click();
  // the bulk action re-renders the changelist; the scoped list is now empty
  await student.waitForLoadState("networkidle");
  await expect(student.locator("#result_list tbody a")).toHaveCount(0, { timeout: 20_000 });
  await student.goto(`${ADMIN_BASE}/admin/disputes/dispute/?status__exact=under_review&q=${disputeQuery}`);
  await student.locator("#result_list tbody a").first().click();
  await student.locator("#outcome").selectOption("refund_student_full");
  await student
    .locator("#resolution_notes")
    .fill("Deadline was missed and evidence confirms it; refunding the student in full.");
  await student.getByRole("button", { name: /execute resolution/i }).click();
  await expect(student.locator(".messagelist")).toContainText(/resolved/i, { timeout: 20_000 });

  // --- financial outcome: the refund lands on the order (ledger via payments) ---
  await student.goto("/orders");
  await student.getByRole("link", { name: /ORD-/ }).first().click();
  await expect(student.getByText(/refunded|disputed|resolved/i).first()).toBeVisible({ timeout: 20_000 });
});
