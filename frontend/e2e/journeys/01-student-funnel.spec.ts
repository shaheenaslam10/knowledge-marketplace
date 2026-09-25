import { expect, test, type Page } from "@playwright/test";

/**
 * Cold-route compiles in the compose dev container (Next dev compiles each
 * route on first visit, 5–15s) make a full multi-account funnel exceed the
 * 30s global default — journeys get an explicit, documented ceiling.
 */
test.setTimeout(300_000);


/**
 * Student journey (brief §7): register → request → receive/select offer →
 * payment → order → delivery → approve → review. Two fresh accounts exercise
 * the real hand-offs; payment uses the manual gateway's dev self-confirm
 * (compose runs dev settings — PAYMENT_DEV_SELF_CONFIRM, never production).
 *
 * Register always lands on /verify-email?registered=1 (auto-login cookies) —
 * that IS the documented redirect, asserted here as behavior.
 */
const stamp = Date.now();
const studentEmail = `e2e-student-${stamp}@demo.local`;
const expertEmail = `e2e-expert-${stamp}@demo.local`;
const PASSWORD = "long-pass-1234";
const requestTitle = `E2E calculus coaching ${stamp}`;

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByTestId("register-submit").click();
  await page.waitForURL(/\/verify-email/, { timeout: 20_000 });
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("student funnel: request → offer → select → pay → deliver → approve → review", async ({ browser }) => {
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();

  // --- student registers and publishes an open request ---
  await register(student, "E2E Student", studentEmail);
  await student.goto("/requests/new");
  // taxonomy terms load asynchronously — wait for a real subject option
  await student.locator("#subject option").nth(1).waitFor({ state: "attached", timeout: 20_000 });
  await student.getByLabel("Title").fill(requestTitle);
  await student.getByLabel("Type of help").selectOption("tutoring");
  await student.getByLabel("Subject").selectOption({ index: 1 });
  await student
    .getByLabel("What do you want to achieve?")
    .fill("Weekly calculus coaching for my first-year exam, focusing on limits and derivatives.");
  await student.getByLabel("Budget max").fill("60");
  await student.getByRole("button", { name: "Publish request" }).click();
  await student.waitForURL(/\/requests\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(student.getByText(/open/i).first()).toBeVisible({ timeout: 20_000 });

  // --- expert applies, admin approves, expert finds the opportunity and offers ---
  const expertContext = await browser.newContext();
  const expert = await expertContext.newPage();
  await register(expert, "E2E Expert", expertEmail);
  await expert.goto("/expert/apply");
  await expert.getByLabel("Professional / display name").fill("E2E Coach");
  await expert.getByLabel("Headline").fill("Calculus coach — patient, exam-focused");
  await expert.getByLabel("Bio").fill("I coach students through calculus fundamentals with guided practice.");
  await expert.getByLabel("Expertise summary").fill("Calculus, algebra, exam prep");
  await expert.getByLabel("Languages").fill("English");
  await expert.getByLabel("Qualifications").fill("MSc Mathematics");
  await expert.getByLabel("Availability").fill("Weekday evenings");
  await expert.getByLabel("Credentials").setInputFiles({
    name: "credential.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expert.getByRole("checkbox", { name: /18/ }).check();
  await expert.getByRole("checkbox", { name: /integrity/i }).check();
  await expert.getByTestId("apply-submit").click();
  await expect(expert.getByText(/submitted|under review/i).first()).toBeVisible({ timeout: 20_000 });

  // admin approves through the real service-transition chain: submitted →
  // under_review → approved (labels match the ExpertApplicationAdmin actions;
  // index-based selection would hit Django's "Delete selected" — a real bug
  // caught by the first CI run of this journey).
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto("/admin/login/");
  await admin.locator("#id_username").fill("admin@demo.local");
  await admin.locator("#id_password").fill("admin-demo-1234");
  await admin.getByRole("button", { name: /log in/i }).click();
  await admin.waitForURL(/\/admin\//, { timeout: 20_000 });
  await admin.goto(`/admin/experts/expertapplication/?q=${expertEmail}`);

  const actionSelect = admin.locator("select[name=action]");
  await admin.locator("#action-toggle").check();
  await actionSelect.selectOption({ label: "Start review (submitted → under review)" });
  await admin.getByRole("button", { name: /go/i }).click();
  await expect(admin.locator(".messagelist")).toContainText(/review/i, { timeout: 20_000 });

  await admin.locator("#action-toggle").check();
  await actionSelect.selectOption({ label: "Approve selected applications" });
  await admin.getByRole("button", { name: /go/i }).click();
  await expect(admin.locator(".messagelist")).toContainText(/approved/i, { timeout: 20_000 });

  // --- expert offers on the open request ---
  await expert.goto("/opportunities");
  await expert.getByRole("link", { name: new RegExp(requestTitle) }).first().click();
  await expert.waitForURL(/\/opportunities\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expert.getByLabel("Your price").fill("55");
  await expert.getByLabel("Proposed schedule").fill("Two sessions per week, starting Monday.");
  await expert
    .getByLabel("Your plan")
    .fill("We will work through limits and derivatives with guided practice, twice a week.");
  await expert.getByRole("button", { name: "Send offer" }).click();
  await expect(expert.getByRole("button", { name: "Update offer" })).toBeVisible({ timeout: 20_000 });

  // --- student selects the offer → order ---
  await student.goto("/requests");
  await student.getByRole("link", { name: "Open", exact: true }).first().click();
  await student.waitForURL(/\/requests\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await student.getByRole("button", { name: "Select expert" }).click();
  await expect(student.getByText(/matched|order/i).first()).toBeVisible({ timeout: 20_000 });

  // --- student pays (manual gateway + dev confirm) → order active ---
  await student.goto("/orders");
  await student.getByRole("link", { name: /ORD-/ }).first().click();
  await student.getByRole("button", { name: "Start payment" }).click();
  await student.getByRole("button", { name: "Confirm payment (dev)" }).click();
  await expect(student.getByText("In progress").first()).toBeVisible({ timeout: 20_000 });

  // --- expert delivers ---
  await expert.goto("/orders");
  await expert.getByRole("link", { name: /ORD-/ }).first().click();
  await expert.getByRole("button", { name: /deliver/i }).first().click();
  await expert
    .getByLabel("Delivery summary")
    .fill("Delivered the full coaching plan with session notes and practice sets.");
  await expert.locator("form").getByRole("button", { name: "Submit delivery" }).click();
  await expect(expert.getByText(/delivered/i).first()).toBeVisible({ timeout: 20_000 });

  // --- student approves and reviews ---
  await student.reload();
  await student.getByRole("button", { name: "Approve delivery" }).click();
  await expect(student.getByText(/completed/i).first()).toBeVisible({ timeout: 20_000 });
  await student.locator('[data-testid="review-composer"]').getByRole("radio", { name: "Overall rating: 5" }).click();
  await student
    .getByLabel("Your review")
    .fill("Excellent coaching style — clear explanations and genuinely useful practice material.");
  await student
    .locator('[data-testid="review-composer"]')
    .getByRole("button", { name: "Publish review" })
    .click();
  await expect(student.locator('[data-testid="review-card"]').first()).toBeVisible({ timeout: 20_000 });
});
