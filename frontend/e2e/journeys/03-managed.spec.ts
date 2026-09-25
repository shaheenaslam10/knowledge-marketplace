import { expect, test } from "@playwright/test";

/**
 * Managed-service journey (brief §7): student submits a managed request →
 * owner triages by creating a direct assignment in Django admin (the service
 * path: quote + audit + email) → expert accepts → student pays → order active.
 */
const stamp = Date.now();
const studentEmail = `e2e-managed-${stamp}@demo.local`;
const PASSWORD = "long-pass-1234";
const title = `E2E managed thesis coaching ${stamp}`;

test("managed service: submit → assign → expert accepts → payment", async ({ browser }) => {
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();

  await student.goto("/register");
  await student.getByLabel("Name").fill("E2E Managed Student");
  await student.getByLabel("Email").fill(studentEmail);
  await student.getByLabel("Password").fill(PASSWORD);
  await student.getByTestId("register-submit").click();
  await student.waitForURL((url) => !url.pathname.startsWith("/register"), { timeout: 15_000 });

  await student.goto("/requests/new");
  // managed mode: sr-only radio inside the "Managed service" mode card
  await student.getByText("Managed service", { exact: true }).click();
  await student.getByLabel("Title").fill(title);
  await student.getByLabel("Type of help").selectOption("tutoring");
  await student.getByLabel("Subject").selectOption({ index: 1 });
  await student
    .getByLabel("What do you want to achieve?")
    .fill("Structured thesis coaching across four sessions, from outline to defense rehearsal.");
  await student.getByLabel("Budget max").fill("120");
  await student.getByRole("button", { name: "Submit for review" }).click();
  await expect(student.getByText(/review|submitted/i).first()).toBeVisible({ timeout: 15_000 });

  // --- owner triage: direct assignment via the Django admin service form ---
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto("/admin/login/");
  await admin.locator("#id_username").fill("admin@demo.local");
  await admin.locator("#id_password").fill("admin-demo-1234");
  await admin.getByRole("button", { name: /log in/i }).click();
  await admin.goto("/admin/assignments/directassignment/add/");
  // request options are "request:<pk>:<status>" (no title) — pick the newest
  // in_review option (ours was just created; the seed owns one older one)
  const inReviewOptions = admin.locator("select#id_request option", { hasText: ":in_review" });
  const optionValues = await inReviewOptions.evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).index),
  );
  await admin
    .locator("select#id_request")
    .selectOption({ index: optionValues[optionValues.length - 1] });
  await admin.locator("select#id_expert").selectOption({ label: "expert@demo.local" });
  await admin.locator("input#id_amount").fill("11000");
  const deadline = admin.locator("input#id_deadline");
  if (await deadline.count()) await deadline.fill(String(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)));
  await admin.getByRole("button", { name: /save/i }).click();
  await expect(admin.getByText(/added|successfully/i).first()).toBeVisible({ timeout: 15_000 });

  // --- expert accepts the assignment ---
  const expertContext = await browser.newContext();
  const expert = await expertContext.newPage();
  await expert.goto("/login");
  await expert.getByLabel("Email").fill("expert@demo.local");
  await expert.getByLabel("Password").fill("demo-password-1234");
  await expert.getByTestId("login-submit").click();
  await expert.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
  await expert.goto("/assignments");
  await expect(expert.getByText(title)).toBeVisible({ timeout: 15_000 });
  await expert.getByRole("button", { name: "Accept", exact: true }).first().click();
  await expect(expert.getByText(/accepted|active/i).first()).toBeVisible({ timeout: 15_000 });

  // --- student pays for the matched order ---
  await student.goto("/orders");
  await student.getByRole("link", { name: /ORD-/ }).first().click();
  await student.getByRole("button", { name: "Start payment" }).click();
  await student.getByRole("button", { name: "Confirm payment (dev)" }).click();
  await expect(student.getByText(/active|paid/i).first()).toBeVisible({ timeout: 15_000 });
});
