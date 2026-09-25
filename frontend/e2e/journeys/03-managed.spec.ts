import { expect, test } from "@playwright/test";

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
const stamp = Date.now();
const studentEmail = `e2e-managed-${stamp}@demo.local`;
const PASSWORD = "long-pass-1234";
const title = `E2E managed thesis coaching ${stamp}`;

test("managed service: submit → assign → expert accepts → payment", async ({ browser }) => {
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();

  await student.goto("/register");
  await student.getByLabel("Full name").fill("E2E Managed Student");
  await student.getByLabel("Email").fill(studentEmail);
  await student.getByLabel("Password").fill(PASSWORD);
  await student.getByTestId("register-submit").click();
  await student.waitForURL(/\/verify-email/, { timeout: 20_000 });

  await student.goto("/requests/new");
  // managed mode: sr-only radio inside the "Managed service" mode card
  await student.getByText("Managed service", { exact: true }).click();
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
  await admin.goto("/admin/login/");
  await admin.locator("#id_username").fill("admin@demo.local");
  await admin.locator("#id_password").fill("admin-demo-1234");
  await admin.getByRole("button", { name: /log in/i }).click();
  await admin.waitForURL(/\/admin\//, { timeout: 20_000 });

  // resolve OUR request's pk from the changelist row (titles are unique per run;
  // option labels in the select are opaque "request:<pk>:<status>")
  await admin.goto(`/admin/service_requests/servicerequest/?q=${encodeURIComponent("E2E managed thesis")}`);
  const requestRow = admin.locator("#result_list tbody tr", { hasText: title }).first();
  await requestRow.waitFor({ state: "visible", timeout: 20_000 });
  const requestPk = await requestRow
    .locator("a")
    .first()
    .getAttribute("href")
    .then((href) => {
      const pkPart = href?.split("/").filter(Boolean).at(-2);
      if (!pkPart) throw new Error(`unexpected changelist href: ${href}`);
      return pkPart;
    });

  await admin.goto("/admin/assignments/directassignment/add/");
  await admin.locator("select#id_request").selectOption(requestPk);
  await admin.locator("select#id_expert").selectOption({ label: "expert:ayra-k" });
  await admin.locator("input#id_amount").fill("11000");
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
  await expert.goto("/login");
  await expert.getByLabel("Email").fill("expert@demo.local");
  await expert.getByLabel("Password").fill("demo-password-1234");
  await expert.getByTestId("login-submit").click();
  await expert.waitForURL(/\/account/, { timeout: 20_000 });
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
  await student.getByRole("button", { name: "Start payment" }).click();
  await student.getByRole("button", { name: "Confirm payment (dev)" }).click();
  await expect(student.getByText("In progress").first()).toBeVisible({ timeout: 20_000 });
});
