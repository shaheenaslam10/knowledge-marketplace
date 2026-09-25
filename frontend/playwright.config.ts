import { defineConfig, devices } from "@playwright/test";

/**
 * E2E assumes the stack is already running (docker compose up — see README).
 * Kept out of `npm test` on purpose: unit tests stay hermetic.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    // E2E_CHROMIUM_PATH: local-sandbox override (CDN-restricted environments);
    // CI uses the standard `npx playwright install` browser.
    launchOptions: process.env.E2E_CHROMIUM_PATH
      ? { executablePath: process.env.E2E_CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
