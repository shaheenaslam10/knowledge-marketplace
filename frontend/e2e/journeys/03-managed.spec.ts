import { expect, test } from "@playwright/test";

import { ADMIN_BASE, login, register, verifyEmail } from "../helpers";

/**
 * Cold-route compiles in the compose dev container (Next dev compiles each
 * route on first visit, 5–15s) make a full multi-account funnel exceed the
 * 30s global default — journeys get an explicit, documented ceiling.
 */
test.setTimeout(300_000);




/**
 * Managed-service journey (brief §7): student submits a managed request →
 * owner triages by creating a direct assignment in the Django admin (the
 * service path: eligibility + quote + audit) → expert accepts → student pays
 * → order in progress.
 */
// identities are generated INSIDE the test callback — CI retries (retries: 1)
// must not reuse emails/titles from a failed attempt
test("managed service: submit → assign → expert accepts → payment", async ({ browser }) => {
  const stamp = Date.now();
  const studentEmail = `e2e-managed-${stamp}@demo.local`;
  const title = `E2E managed thesis coaching ${stamp}`;
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();

  await register(student, "E2E Managed Student", studentEmail);
  await verifyEmail(student, studentEmail);

  await student.goto("/requests/new");
  // managed mode: sr-only radio inside the "Managed service" mode card. The
  // submit button label tracks form.mode, so it doubles as the hydration marker —
  // retry the click until React is live (pre-hydration clicks are silently wiped).
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await student.getByText("Managed service", { exact: true }).click();
    try {
      await student.getByRole("button", { name: "Submit for review" }).waitFor({ state: "visible", timeout: 3_000 });
      break;
    } catch {
      /* hydration retry — see e2e/helpers.ts */
    }
  }
  await student.locator("#subject option").nth(1).waitFor({ state: "attached", timeout: 20_000 });
  await student.getByLabel("Title").fill(title);
  await student.getByLabel("Type of help").selectOption("tutoring");
  await student.getByLabel("Subject").selectOption({ index: 1 });
  await student
    .getByLabel("What do you want to achieve?")
    .fill("Structured thesis coaching across four sessions, from outline to defense rehearsal.");
  await student.getByLabel("Budget max").fill("120");
  await student.getByRole("button", { name: "Submit for review" }).click();
  await student.waitForURL(/\/requests\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(student.getByText(/review/i).first()).toBeVisible({ timeout: 20_000 });

  // --- owner triage: direct assignment via the Django admin service form ---
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto(`${ADMIN_BASE}/admin/login/`);
  await admin.locator("#id_username").fill("admin@demo.local");
  await admin.locator("#id_password").fill("admin-demo-1234");
  await admin.getByRole("button", { name: /log in/i }).click();
  await admin.waitForURL(/\/admin\//, { timeout: 20_000 });

  // resolve OUR request's pk from the changelist row (titles are unique per run;
  // option labels in the select are opaque "request:<pk>:<status>")
  await admin.goto(`${ADMIN_BASE}/admin/service_requests/servicerequest/?q=${encodeURIComponent("E2E managed thesis")}`);
  const requestRow = admin.locator("#result_list tbody tr", { hasText: title }).first();
  await requestRow.waitFor({ state: "visible", timeout: 20_000 });
  const requestPk = await requestRow
    .locator("a")
    .first()
    .getAttribute("href")
    .then((href) => {
      // pathname only — the query string (?_changelist_filters=…) would make
      // a naive split().at(-2) return "change" instead of the pk
      const pkPart = new URL(href ?? "/", ADMIN_BASE).pathname
        .split("/")
        .filter(Boolean)
        .at(-2);
      if (!pkPart || pkPart === "change") throw new Error(`unexpected changelist href: ${href}`);
      return pkPart;
    });

  await admin.goto(`${ADMIN_BASE}/admin/assignments/directassignment/add/`);
  await admin.locator("select#id_request").selectOption(requestPk);
  // the admin widget renders users by email — expert@demo.local is the seeded expert
  await admin.locator("select#id_expert").selectOption({ label: "expert@demo.local" });
  await admin.locator("input#id_amount").fill("11000"); // minor units: $110.00
  // remaining required fields of the model (snapshot + audit + offer expiry)
  await admin.locator("input#id_expert_name").fill("Ayra K.");
  await admin.locator("select#id_decided_by_admin").selectOption({ label: "admin@demo.local" });
  const expires = new Date(Date.now() + 7 * 864e5);
  await admin.locator("input#id_expires_at_0").fill(expires.toISOString().slice(0, 10));
  await admin.locator("input#id_expires_at_1").fill("23:59:59");
  const deadline = admin.locator("input#id_deadline");
  if (await deadline.count()) {
    await deadline.fill(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  }
  await admin.getByRole("button", { name: /save/i }).first().click();
  await expect(admin.locator(".messagelist")).toContainText(/added|success/i, { timeout: 20_000 });

  // --- expert accepts OUR assignment (scoped by title — the seed also has a
  // pending pool invitation with its own Accept button) ---
  const expertContext = await browser.newContext();
  const expert = await expertContext.newPage();
  await login(expert, "expert@demo.local", "demo-password-1234");
  await expert.goto("/assignments");
  const assignmentCard = expert.locator("div.rounded-lg", { hasText: title }).first();
  await assignmentCard.waitFor({ state: "visible", timeout: 20_000 });
  await assignmentCard.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(assignmentCard.getByText(/accepted|in progress|active/i).first()).toBeVisible({ timeout: 20_000 });

  // --- student pays for the matched order ---
  await student.goto("/orders");
  const orderLink = student.getByRole("link", { name: /ORD-/ }).first();
  await orderLink.waitFor({ state: "visible", timeout: 20_000 });
  await orderLink.click();
  await student.getByRole("button", { name: "Pay now" }).click();
  await student.getByRole("button", { name: "Confirm payment (dev)" }).click();
  await expect(student.getByText("In progress").first()).toBeVisible({ timeout: 20_000 });
});
