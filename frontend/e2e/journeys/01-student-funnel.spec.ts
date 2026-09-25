import { expect, test, type Page } from "@playwright/test";

/**
 * Student journey (brief §7): register → request → receive/select offer →
 * payment → order → delivery → approve → review. Two fresh accounts exercise
 * the real hand-offs; payment uses the manual gateway's dev self-confirm
 * (compose runs dev settings — PAYMENT_DEV_SELF_CONFIRM, never production).
 */
const stamp = Date.now();
const studentEmail = `e2e-student-${stamp}@demo.local`;
const expertEmail = `e2e-expert-${stamp}@demo.local`;
const PASSWORD = "long-pass-1234";
const requestTitle = `E2E calculus coaching ${stamp}`;

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByTestId("register-submit").click();
  await page.waitForURL(/\/(requests|onboarding|account)/, { timeout: 15_000 });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
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
  await student.getByLabel("Title").fill(requestTitle);
  await student.getByLabel("Type of help").selectOption("tutoring");
  await student.getByLabel("Subject").selectOption({ index: 1 });
  await student
    .getByLabel("What do you want to achieve?")
    .fill("Weekly calculus coaching for my first-year exam, focusing on limits and derivatives.");
  await student.getByLabel("Budget max").fill("60");
  await student.getByRole("button", { name: "Publish request" }).click();
  await expect(student.getByText(/published|open/i).first()).toBeVisible({ timeout: 15_000 });

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
  await expect(expert.getByText(/submitted|under review/i).first()).toBeVisible({ timeout: 15_000 });

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto("/admin/login/");
  await admin.locator("#id_username").fill("admin@demo.local");
  await admin.locator("#id_password").fill("admin-demo-1234");
  await admin.getByRole("button", { name: /log in/i }).click();
  await admin.goto("/admin/experts/expertapplication/?q=" + expertEmail);
  const actionSelect = admin.locator("select[name=action]");
  // submitted → under_review → approved (service transition chain)
  await admin.locator("#action-toggle").check();
  await actionSelect.selectOption({ index: 1 }); // start review
  await admin.getByRole("button", { name: /go/i }).click();
  await expect(admin.getByText(/review/i).first()).toBeVisible({ timeout: 15_000 });
  await admin.locator("#action-toggle").check();
  await actionSelect.selectOption({ index: 2 }); // approve
  await admin.getByRole("button", { name: /go/i }).click();
  await expect(admin.getByText(/approved/i).first()).toBeVisible({ timeout: 15_000 });

  await expert.goto("/opportunities");
  await expect(expert.getByText(requestTitle)).toBeVisible({ timeout: 15_000 });
  await expert.getByText(requestTitle).click();
  await expert.getByLabel("Your price").fill("55");
  await expert.getByLabel("Your plan").fill("We will work through limits and derivatives with guided practice, twice a week.");
  await expert.getByRole("button", { name: "Send offer" }).click();
  await expect(expert.getByText(/offer (sent|updated|pending)/i).first()).toBeVisible({ timeout: 15_000 });

  // --- student selects the offer → order ---
  await student.goto("/requests");
  await student.getByText(requestTitle).first().click();
  await student.getByRole("button", { name: "Select expert" }).click();
  await expect(student.getByText(/matched|order created|in_progress/i).first()).toBeVisible({ timeout: 15_000 });

  // --- student pays (manual gateway + dev confirm) → order active ---
  await student.goto("/orders");
  await student.getByRole("link", { name: /ORD-|order/i }).first().click();
  await student.getByRole("button", { name: "Start payment" }).click();
  await student.getByRole("button", { name: "Confirm payment (dev)" }).click();
  await expect(student.getByText(/active|paid/i).first()).toBeVisible({ timeout: 15_000 });

  // --- expert delivers ---
  await expert.goto("/orders");
  await expert.getByRole("link", { name: /ORD-|order/i }).first().click();
  await expert.getByRole("button", { name: /deliver/i }).click();
  await expert
    .getByLabel("Delivery summary")
    .fill("Delivered the full coaching plan with session notes and practice sets.");
  await expert.getByRole("button", { name: /submit delivery/i }).click();
  await expect(expert.getByText(/delivered|awaiting approval/i).first()).toBeVisible({ timeout: 15_000 });

  // --- student approves and reviews ---
  await student.reload();
  await student.getByRole("button", { name: "Approve delivery" }).click();
  await expect(student.getByText(/completed/i).first()).toBeVisible({ timeout: 15_000 });
  await student.locator('[data-testid="review-composer"]').getByRole("radio", { name: /Overall rating: 5/ }).click();
  await student
    .getByLabel("Your review")
    .fill("Excellent coaching style — clear explanations and genuinely useful practice material.");
  await student
    .locator('[data-testid="review-composer"]')
    .getByRole("button", { name: "Publish review" })
    .click();
  await expect(student.locator('[data-testid="review-card"]').first()).toBeVisible({ timeout: 15_000 });
});
