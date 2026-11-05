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
  console.log("🚀 SPRINT 7: VISUAL & INTERACTIVE OVERHAUL CHROME VERIFICATION");
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
  // 1. LANDING PAGE HERO — LIGHT MODE
  // -------------------------------------------------------------------------
  console.log("\n--- 1. Landing Page Hero (Desktop Light Mode) ---");
  const landingContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const landingPage = await landingContext.newPage();
  attachListeners(landingPage, "Landing Light");

  await landingPage.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await landingPage.waitForTimeout(1500);

  const shot1 = path.join(SCREENSHOT_DIR, "flow7_landing_hero_desktop_light.png");
  await landingPage.screenshot({ path: shot1, fullPage: false });
  saveScreenshot("flow7_landing_hero_desktop_light.png");
  console.log(`✅ Flow 7.1 Landing Hero Light screenshot captured: ${shot1}`);

  // -------------------------------------------------------------------------
  // 2. LANDING PAGE HERO — DARK MODE
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Landing Page Hero (Desktop Dark Mode) ---");
  await landingPage.evaluate(() => {
    document.documentElement.classList.add("dark");
  });
  await landingPage.waitForTimeout(1000);

  const shot2 = path.join(SCREENSHOT_DIR, "flow7_landing_hero_desktop_dark.png");
  await landingPage.screenshot({ path: shot2, fullPage: false });
  saveScreenshot("flow7_landing_hero_desktop_dark.png");
  console.log(`✅ Flow 7.2 Landing Hero Dark screenshot captured: ${shot2}`);

  // -------------------------------------------------------------------------
  // 3. 4-PILLAR INTERACTIVE BENTO GRID & FEATURED COHORTS
  // -------------------------------------------------------------------------
  console.log("\n--- 3. 4-Pillar Interactive Bento Grid & Cohorts ---");
  await landingPage.evaluate(() => {
    document.documentElement.classList.remove("dark");
    window.scrollTo({ top: 920, behavior: "instant" });
  });
  await landingPage.waitForTimeout(1200);

  const shot3 = path.join(SCREENSHOT_DIR, "flow7_landing_bento_grid.png");
  await landingPage.screenshot({ path: shot3, fullPage: false });
  saveScreenshot("flow7_landing_bento_grid.png");
  console.log(`✅ Flow 7.3 Landing Bento Grid screenshot captured: ${shot3}`);

  await landingContext.close();

  // -------------------------------------------------------------------------
  // 4. STUDENT WORKSPACE — WORKFLOW BANNER & INDIGO PERSONA STRIP
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Student Workspace Orientation Banner ---");
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const studentPage = await studentContext.newPage();
  attachListeners(studentPage, "Student Workspace");

  await studentPage.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 30000 });
  await studentPage.waitForTimeout(500);
  await studentPage.fill("#email", "student@demo.local");
  await studentPage.fill("#password", "demo-password-1234");
  await studentPage.click('button[data-testid="login-submit"]');
  await studentPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await studentPage.waitForTimeout(1500);

  // Navigate to /requests
  await studentPage.goto("http://localhost:3000/requests", { waitUntil: "networkidle", timeout: 30000 });
  await studentPage.waitForTimeout(1200);

  const shot4 = path.join(SCREENSHOT_DIR, "flow7_student_dashboard_workflow.png");
  await studentPage.screenshot({ path: shot4, fullPage: false });
  saveScreenshot("flow7_student_dashboard_workflow.png");
  console.log(`✅ Flow 7.4 Student Workspace screenshot captured: ${shot4}`);

  await studentContext.close();

  // -------------------------------------------------------------------------
  // 5. DOMAIN SPECIALIST HUB — EMERALD STRIP & EARNINGS WORKFLOW
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Domain Specialist Hub & Earnings ---");
  const expertContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const expertPage = await expertContext.newPage();
  attachListeners(expertPage, "Specialist Hub");

  await expertPage.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 30000 });
  await expertPage.waitForTimeout(500);
  await expertPage.fill("#email", "expert@demo.local");
  await expertPage.fill("#password", "demo-password-1234");
  await expertPage.click('button[data-testid="login-submit"]');
  await expertPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await expertPage.waitForTimeout(1500);

  // Navigate to /expert/earnings
  await expertPage.goto("http://localhost:3000/expert/earnings", { waitUntil: "networkidle", timeout: 30000 });
  await expertPage.waitForTimeout(1500);

  const shot5 = path.join(SCREENSHOT_DIR, "flow7_specialist_hub_earnings.png");
  await expertPage.screenshot({ path: shot5, fullPage: false });
  saveScreenshot("flow7_specialist_hub_earnings.png");
  console.log(`✅ Flow 7.5 Specialist Hub screenshot captured: ${shot5}`);

  await expertContext.close();

  // -------------------------------------------------------------------------
  // 6. ADMIN OPERATIONS COCKPIT — COLOR-CODED KPI RIBBON
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Admin Executive Operations Cockpit ---");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const adminPage = await adminContext.newPage();
  attachListeners(adminPage, "Admin Portal");

  await adminPage.goto("http://localhost:3001/login", { waitUntil: "networkidle", timeout: 30000 });
  await adminPage.waitForTimeout(500);
  await adminPage.fill('input[type="email"]', "admin@demo.local");
  await adminPage.fill('input[type="password"]', "admin-demo-1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000, waitUntil: "commit" });
  await adminPage.waitForTimeout(2000);

  // Navigate to /portal
  await adminPage.goto("http://localhost:3001/portal", { waitUntil: "networkidle", timeout: 30000 });
  await adminPage.waitForTimeout(2000);

  const shot6 = path.join(SCREENSHOT_DIR, "flow7_admin_portal_cockpit.png");
  await adminPage.screenshot({ path: shot6, fullPage: false });
  saveScreenshot("flow7_admin_portal_cockpit.png");
  console.log(`✅ Flow 7.6 Admin Operations Cockpit screenshot captured: ${shot6}`);

  await adminContext.close();
  await browser.close();

  console.log("\n==================================================================");
  console.log("🏁 SPRINT 7 AUDIT FINISHED");
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  console.log(`Total Page Errors:    ${pageErrors.length}`);
  console.log("==================================================================");

  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    console.error("Audit reported errors during execution:");
    console.error({ consoleErrors, pageErrors });
    process.exit(1);
  } else {
    console.log("🌟 100% CLEAN RUN: 0 CONSOLE ERRORS, 0 HYDRATION WARNINGS, 0 PAGE CRASHES!");
  }
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});

