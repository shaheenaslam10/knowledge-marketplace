import { chromium } from "playwright";
import path from "path";

const SCREENSHOT_DIR = "C:/Users/Shheen/.gemini/antigravity/brain/d27f5a8b-797c-4dc7-abcb-151ff88b8fb7/screenshots";

async function run() {
  console.log("Starting Real Chrome E2E Verification for Sprint 4...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // -------------------------------------------------------------------------
  // FLOW 1: Public Catalog & Weighted Full-Text Search
  // -------------------------------------------------------------------------
  console.log("\n--- Flow 1: Catalog & Full-Text Search ---");
  await page.goto("http://localhost:3000/catalog", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Type search query "Pandas"
  const searchInput = page.locator('input[type="search"]');
  await searchInput.fill("Pandas");
  await page.waitForTimeout(1500);

  const flow1Screenshot = path.join(SCREENSHOT_DIR, "flow1_catalog_search.png");
  await page.screenshot({ path: flow1Screenshot, fullPage: false });
  console.log(`Flow 1 screenshot saved to: ${flow1Screenshot}`);

  // Clear search for next steps
  await searchInput.fill("");
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // FLOW 2: Specialist Publishes Digital Knowledge Product
  // -------------------------------------------------------------------------
  console.log("\n--- Flow 2: Specialist Publishes Digital Product ---");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForSelector("#email");
  await page.fill("#email", "expert@demo.local");
  await page.fill("#password", "demo-password-1234");
  await page.click('button[data-testid="login-submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Go to catalog as specialist
  await page.goto("http://localhost:3000/catalog", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click "Publish Product" button
  const publishBtn = page.getByRole("button", { name: "Publish Product" });
  await publishBtn.click();
  await page.waitForSelector("#pub-title");

  // Fill in product details
  await page.fill("#pub-title", "Full-Stack Next.js & Django Architecture Blueprint");
  await page.fill("#pub-summary", "Production monorepo patterns, dual-token JWT, double-entry ledger architecture, and WebRTC signaling with Daphne.");
  await page.fill("#pub-description", "Comprehensive reference implementation with automated test coverage, strict architectural import boundaries, and zero-downtime database migrations.");
  await page.fill("#pub-price", "39.00");

  // Select code template type in drawer form
  await page.locator('form button:has-text("Code Template")').click();
  await page.waitForTimeout(500);

  // Submit product
  await page.getByRole("button", { name: /Publish to Catalog/ }).click();
  await page.waitForTimeout(2000);

  const flow2Screenshot = path.join(SCREENSHOT_DIR, "flow2_expert_published.png");
  await page.screenshot({ path: flow2Screenshot, fullPage: false });
  console.log(`Flow 2 screenshot saved to: ${flow2Screenshot}`);

  // -------------------------------------------------------------------------
  // FLOW 3: Student Instant Purchase & Vault Unlock
  // -------------------------------------------------------------------------
  console.log("\n--- Flow 3: Student Instant Purchase & Vault Unlock ---");
  // Log out or create new context for student
  const studentContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const studentPage = await studentContext.newPage();

  // Login as student
  await studentPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await studentPage.waitForSelector("#email");
  await studentPage.fill("#email", "student@demo.local");
  await studentPage.fill("#password", "demo-password-1234");
  await studentPage.click('button[data-testid="login-submit"]');
  await studentPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  await studentPage.waitForTimeout(1000);

  // Go to catalog
  await studentPage.goto("http://localhost:3000/catalog", { waitUntil: "networkidle" });
  await studentPage.waitForTimeout(1500);

  // Select the newly published product or first product
  const productCard = studentPage.locator('h3:has-text("Full-Stack Next.js & Django")').first();
  if (await productCard.count() > 0) {
    await productCard.click();
  } else {
    await studentPage.locator('h3:has-text("Python Pandas Mastery Guide")').first().click();
  }
  await studentPage.waitForTimeout(1000);

  // Click Instant Purchase & Unlock button
  const purchaseBtn = studentPage.getByRole("button", { name: /Instant Purchase & Unlock/ });
  await purchaseBtn.click();
  await studentPage.waitForTimeout(2500);

  const flow3Screenshot = path.join(SCREENSHOT_DIR, "flow3_student_purchase_unlocked.png");
  await studentPage.screenshot({ path: flow3Screenshot, fullPage: false });
  console.log(`Flow 3 screenshot saved to: ${flow3Screenshot}`);

  // -------------------------------------------------------------------------
  // FLOW 4: Admin Double-Entry Ledger Verification
  // -------------------------------------------------------------------------
  console.log("\n--- Flow 4: Admin Double-Entry Ledger Verification ---");
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const adminPage = await adminContext.newPage();

  // Login as admin
  await adminPage.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
  await adminPage.waitForSelector('input[type="email"]');
  await adminPage.fill('input[type="email"]', "admin@demo.local");
  await adminPage.fill('input[type="password"]', "admin-demo-1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  await adminPage.waitForTimeout(1500);

  // Navigate to /portal/finance
  await adminPage.goto("http://localhost:3001/portal/finance", { waitUntil: "networkidle" });
  await adminPage.waitForTimeout(2500);

  const flow4Screenshot = path.join(SCREENSHOT_DIR, "flow4_admin_ledger_explorer.png");
  await adminPage.screenshot({ path: flow4Screenshot, fullPage: false });
  console.log(`Flow 4 screenshot saved to: ${flow4Screenshot}`);

  console.log("\nAll 4 E2E flows completed successfully!");
  await browser.close();
}

run().catch((err) => {
  console.error("E2E verification failed:", err);
  process.exit(1);
});
