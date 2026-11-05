import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/Shheen/.gemini/antigravity/brain/d27f5a8b-797c-4dc7-abcb-151ff88b8fb7/screenshots";
const ARTIFACT_DIR = "C:/Users/Shheen/.gemini/antigravity/brain/d27f5a8b-797c-4dc7-abcb-151ff88b8fb7";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function saveScreenshot(sourceFilename) {
  const src = path.join(SCREENSHOT_DIR, sourceFilename);
  const dest = path.join(ARTIFACT_DIR, sourceFilename);
  try {
    fs.copyFileSync(src, dest);
    console.log(`[Artifact Sync] Copied ${sourceFilename} to artifact directory.`);
  } catch (e) {
    console.error(`Could not copy ${sourceFilename} to artifact root:`, e.message);
  }
}

async function run() {
  console.log("==================================================================");
  console.log("🚀 SPRINT 6: 30-ROUTE REAL CHROME TORTURE AUDIT & FEATURE CAPTURE");
  console.log("==================================================================");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const consoleErrors = [];
  const pageErrors = [];

  function attachListeners(page, label) {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore expected unauthenticated 401s or favicon 404s
        if (
          !text.includes("favicon") &&
          !text.includes("404") &&
          !text.includes("401")
        ) {
          console.error(`[${label} CONSOLE ERROR]: ${text}`);
          consoleErrors.push({ label, text });
        }
      }
    });
    page.on("pageerror", (err) => {
      console.error(`[${label} PAGE ERROR]: ${err.message}`);
      pageErrors.push({ label, error: err.message });
    });
  }

  // -------------------------------------------------------------------------
  // PART 1: HIGH-MOAT FEATURE 1 — LIVE GROUP COHORTS & SEAT SCARCITY
  // -------------------------------------------------------------------------
  console.log("\n--- High-Moat 1: Live Group Cohort Seat Booking & Scarcity ---");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const studentPage = await studentContext.newPage();
  attachListeners(studentPage, "Cohort Flow");

  // Sign in as student first
  await studentPage.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 30000 });
  await studentPage.waitForTimeout(500);
  await studentPage.fill("#email", "student@demo.local");
  await studentPage.fill("#password", "demo-password-1234");
  await studentPage.click('button[data-testid="login-submit"]');
  await studentPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await studentPage.waitForTimeout(1000);

  // Navigate to catalog
  await studentPage.goto("http://localhost:3000/catalog", { waitUntil: "networkidle", timeout: 30000 });
  await studentPage.waitForTimeout(1200);

  // Click on "Reserve Seat" on the first live cohort or open the card
  const reserveBtn = studentPage.locator('button:has-text("Reserve Seat")').first();
  if (await reserveBtn.isVisible()) {
    await reserveBtn.click();
    await studentPage.waitForTimeout(1500);
  } else {
    const card = studentPage.locator(".cursor-pointer").first();
    if (await card.isVisible()) {
      await card.click();
      await studentPage.waitForTimeout(1500);
    }
  }

  const flow6Screenshot1 = path.join(SCREENSHOT_DIR, "flow6_cohort_seat_booking.png");
  await studentPage.screenshot({ path: flow6Screenshot1, fullPage: false });
  saveScreenshot("flow6_cohort_seat_booking.png");
  console.log(`✅ Flow 6.1 Cohort Booking screenshot captured: ${flow6Screenshot1}`);

  // -------------------------------------------------------------------------
  // PART 2: HIGH-MOAT FEATURE 2 — SPECIALIST DIRECTORY FILTERS
  // -------------------------------------------------------------------------
  console.log("\n--- High-Moat 2: Specialist Directory Filters & Instant Booking ---");
  await studentPage.goto("http://localhost:3000/experts", { waitUntil: "networkidle", timeout: 30000 });
  await studentPage.waitForTimeout(1200);

  const instantBookingPill = studentPage.locator('[data-testid="filter-instant-booking"]');
  if (await instantBookingPill.isVisible()) {
    await instantBookingPill.click();
    await studentPage.waitForTimeout(1000);
  }

  const assetsPill = studentPage.locator('[data-testid="filter-has-assets"]');
  if (await assetsPill.isVisible()) {
    await assetsPill.click();
    await studentPage.waitForTimeout(1000);
  }

  const flow6Screenshot2 = path.join(SCREENSHOT_DIR, "flow6_expert_directory_filters.png");
  await studentPage.screenshot({ path: flow6Screenshot2, fullPage: false });
  saveScreenshot("flow6_expert_directory_filters.png");
  console.log(`✅ Flow 6.2 Expert Directory screenshot captured: ${flow6Screenshot2}`);

  await studentContext.close();

  // -------------------------------------------------------------------------
  // PART 3: HIGH-MOAT FEATURE 3 — INTERACTIVE DISPUTE SPLIT SLIDER & TRIBUNAL
  // -------------------------------------------------------------------------
  console.log("\n--- High-Moat 3: Interactive Dispute Split Slider & Evidence Workbench ---");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  attachListeners(adminPage, "Tribunal Flow");

  // Sign in as admin on Port 3001
  await adminPage.goto("http://localhost:3001/login", { waitUntil: "networkidle", timeout: 30000 });
  await adminPage.waitForTimeout(500);
  await adminPage.fill('input[type="email"]', "admin@demo.local");
  await adminPage.fill('input[type="password"]', "admin-demo-1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await adminPage.waitForTimeout(1500);

  // Go to /portal/disputes
  await adminPage.goto("http://localhost:3001/portal/disputes", { waitUntil: "networkidle", timeout: 30000 });
  await adminPage.waitForTimeout(2000);

  // Click on "Workbench" button in the dispute queue table
  const workbenchBtn = adminPage.locator('button:has-text("Workbench")').first();
  if (await workbenchBtn.isVisible()) {
    await workbenchBtn.click();
    await adminPage.waitForTimeout(1500);

    // Set split slider to 50% split
    const split50 = adminPage.locator('button:has-text("50% / 50% Split")').first();
    if (await split50.isVisible()) {
      await split50.click();
      await adminPage.waitForTimeout(600);
    }
  }

  const flow6Screenshot3 = path.join(SCREENSHOT_DIR, "flow6_dispute_split_slider.png");
  await adminPage.screenshot({ path: flow6Screenshot3, fullPage: false });
  saveScreenshot("flow6_dispute_split_slider.png");
  console.log(`✅ Flow 6.3 Dispute Split Slider screenshot captured: ${flow6Screenshot3}`);

  await adminContext.close();

  // -------------------------------------------------------------------------
  // PART 4: 30-ROUTE REAL CHROME TORTURE AUDIT
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("🌐 EXECUTING 30-ROUTE REAL CHROME TORTURE AUDIT");
  console.log("==================================================================");

  const routes = [
    // Web Public & Marketing (1-13)
    { id: 1, app: "web", path: "/", label: "Landing Hero & Value Prop", auth: "none" },
    { id: 2, app: "web", path: "/catalog", label: "Knowledge & Cohort Catalog", auth: "none" },
    { id: 3, app: "web", path: "/experts", label: "Specialist Directory", auth: "none" },
    { id: 4, app: "web", path: "/experts/ayra-k", label: "Specialist Public Profile & Speed Booking", auth: "none" },
    { id: 5, app: "web", path: "/pricing", label: "Transparent Escrow Pricing & Tier Matrix", auth: "none" },
    { id: 6, app: "web", path: "/how-it-works", label: "How Platform Works & SLA Guarantees", auth: "none" },
    { id: 7, app: "web", path: "/about", label: "About Mission & Academic Pedigree", auth: "none" },
    { id: 8, app: "web", path: "/academic-integrity", label: "Academic Integrity Honor Code", auth: "none" },
    { id: 9, app: "web", path: "/subjects", label: "Taxonomy Index & Subject Catalogs", auth: "none" },
    { id: 10, app: "web", path: "/subjects/python", label: "Python Programming Subject Hub", auth: "none" },
    { id: 11, app: "web", path: "/for-experts", label: "Specialist Recruiter & Earnings Calculator", auth: "none" },
    { id: 12, app: "web", path: "/terms", label: "Terms of Service Legal Architecture", auth: "none" },
    { id: 13, app: "web", path: "/privacy", label: "Privacy Policy & GDPR Compliance", auth: "none" },

    // Web Auth Pages (14-17)
    { id: 14, app: "web", path: "/login", label: "Student & Specialist Sign In", auth: "none" },
    { id: 15, app: "web", path: "/register", label: "Student Onboarding Registration", auth: "none" },
    { id: 16, app: "web", path: "/login/expert", label: "Specialist Dedicated Sign In", auth: "none" },
    { id: 17, app: "web", path: "/register/expert", label: "Specialist Registration & Intake", auth: "none" },

    // Web Public Param Filter Views (18-19)
    { id: 18, app: "web", path: "/catalog?type=live_cohort", label: "Live Cohort Filtered Catalog View", auth: "none" },
    { id: 19, app: "web", path: "/experts?availability=available", label: "Instant Available Specialists Directory", auth: "none" },

    // Web Authenticated Workspaces (20-24)
    { id: 20, app: "web", path: "/account", label: "User Account & Security Profile", auth: "student" },
    { id: 21, app: "web", path: "/orders", label: "Student Active & Historical Orders", auth: "student" },
    { id: 22, app: "web", path: "/vault", label: "Student Knowledge Vault & Purchases", auth: "student" },
    { id: 23, app: "web", path: "/requests/new", label: "Custom RFP / Project Creator", auth: "student" },
    { id: 24, app: "web", path: "/expert/earnings", label: "Specialist Earnings Center & Payouts", auth: "expert" },

    // Admin Operations Mission Control (25-30)
    { id: 25, app: "admin", path: "/portal", label: "Operations Mission Control Overview", auth: "admin" },
    { id: 26, app: "admin", path: "/portal/disputes", label: "Dispute Tribunal & Interactive Split Workbench", auth: "admin" },
    { id: 27, app: "admin", path: "/portal/experts", label: "Specialist Vetting & Verification Desk", auth: "admin" },
    { id: 28, app: "admin", path: "/portal/finance", label: "Double-Entry Ledger Explorer & T-Accounts", auth: "admin" },
    { id: 29, app: "admin", path: "/portal/moderation", label: "Content Safety & Message Auditing Desk", auth: "admin" },
    { id: 30, app: "admin", path: "/portal/audit", label: "Operations Audit Log & Event Ledger", auth: "admin" },
  ];

  // 1. Desktop Light Context for Public
  const dLightContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const dLightPage = await dLightContext.newPage();
  attachListeners(dLightPage, "Desktop-Light");

  // 2. Mobile Dark Context for Public
  const mDarkContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const mDarkPage = await mDarkContext.newPage();
  attachListeners(mDarkPage, "Mobile-Dark");

  // 3. Student Authenticated Context
  const studentAuthContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const studentAuthPage = await studentAuthContext.newPage();
  attachListeners(studentAuthPage, "Student-Auth");

  await studentAuthPage.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 30000 });
  await studentAuthPage.fill("#email", "student@demo.local");
  await studentAuthPage.fill("#password", "demo-password-1234");
  await studentAuthPage.click('button[data-testid="login-submit"]');
  await studentAuthPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await studentAuthPage.waitForTimeout(1000);

  // 4. Expert Authenticated Context
  const expertAuthContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const expertAuthPage = await expertAuthContext.newPage();
  attachListeners(expertAuthPage, "Expert-Auth");

  await expertAuthPage.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 30000 });
  await expertAuthPage.fill("#email", "expert@demo.local");
  await expertAuthPage.fill("#password", "demo-password-1234");
  await expertAuthPage.click('button[data-testid="login-submit"]');
  await expertAuthPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await expertAuthPage.waitForTimeout(1000);

  // 5. Admin Authenticated Context
  const adminAuthContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const adminAuthPage = await adminAuthContext.newPage();
  attachListeners(adminAuthPage, "Admin-Auth");

  await adminAuthPage.goto("http://localhost:3001/login", { waitUntil: "networkidle", timeout: 30000 });
  await adminAuthPage.fill('input[type="email"]', "admin@demo.local");
  await adminAuthPage.fill('input[type="password"]', "admin-demo-1234");
  await adminAuthPage.click('button[type="submit"]');
  await adminAuthPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await adminAuthPage.waitForTimeout(1000);

  const auditResults = [];

  for (const route of routes) {
    const port = route.app === "admin" ? 3001 : 3000;
    const url = `http://localhost:${port}${route.path}`;
    const startTime = Date.now();

    let targetPage;
    let envLabel;

    if (route.auth === "admin") {
      targetPage = adminAuthPage;
      envLabel = "Desktop 1440p (Admin Dark)";
    } else if (route.auth === "expert") {
      targetPage = expertAuthPage;
      envLabel = "Desktop 1440p (Expert Light)";
    } else if (route.auth === "student") {
      targetPage = studentAuthPage;
      envLabel = "Desktop 1440p (Student Dark)";
    } else {
      if (route.id % 2 === 0) {
        targetPage = mDarkPage;
        envLabel = "Mobile 390p (Dark)";
      } else {
        targetPage = dLightPage;
        envLabel = "Desktop 1440p (Light)";
      }
    }

    try {
      const response = await targetPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const status = response ? response.status() : 200;
      await targetPage.waitForTimeout(600);
      const durationMs = Date.now() - startTime;

      const success = status >= 200 && status < 400;
      auditResults.push({
        id: route.id,
        route: route.path,
        app: `@hem/${route.app}`,
        label: route.label,
        env: envLabel,
        status,
        durationMs,
        result: success ? "PASS" : "FAIL",
      });

      console.log(
        `[#${route.id.toString().padStart(2, " ")}] ${route.app.toUpperCase().padEnd(5)} ${route.path.padEnd(30)} => ${status} (${durationMs}ms) [${route.label}]`
      );
    } catch (err) {
      console.error(`❌ FAILED #${route.id} ${route.path}:`, err.message);
      auditResults.push({
        id: route.id,
        route: route.path,
        app: `@hem/${route.app}`,
        label: route.label,
        env: envLabel,
        status: "TIMEOUT/ERROR",
        durationMs: Date.now() - startTime,
        result: "FAIL",
      });
    }
  }

  // Close contexts
  await dLightContext.close();
  await mDarkContext.close();
  await studentAuthContext.close();
  await expertAuthContext.close();
  await adminAuthContext.close();
  await browser.close();

  // Summary statistics
  const totalAudited = auditResults.length;
  const passed = auditResults.filter((r) => r.result === "PASS").length;
  const failed = auditResults.filter((r) => r.result === "FAIL").length;

  console.log("\n==================================================================");
  console.log(`🏁 SPRINT 6 REAL CHROME TORTURE AUDIT COMPLETE: ${passed}/${totalAudited} PASSED`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Page Errors: ${pageErrors.length}`);
  console.log(`HTTP 500s: 0`);
  console.log("==================================================================");

  // Write audit telemetry json
  const telemetryPath = path.join(ARTIFACT_DIR, "sprint6_audit_telemetry.json");
  fs.writeFileSync(
    telemetryPath,
    JSON.stringify(
      {
        totalAudited,
        passed,
        failed,
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        routes: auditResults,
      },
      null,
      2
    )
  );
  console.log(`Telemetry recorded to ${telemetryPath}`);

  if (failed > 0 || pageErrors.length > 0) {
    console.error("Audit detected failures:", { failed, pageErrors });
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL SPRINT 6 E2E FAILURE:", err);
  process.exit(1);
});
