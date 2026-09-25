import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

/**
 * Shared E2E helpers (Phase 11 journeys).
 *
 * Dev-mode hydration: typing before React hydrates gets wiped by the
 * hydration render (controlled inputs reset), so every auth form retries
 * fill+submit — the same thing a real user does when a slow first render
 * eats their input.
 */

/**
 * Email verification in dev/compose rides the console email backend — the
 * verification URL (with its single-use token) is printed to the process
 * log (worker container in compose; qcluster stdout locally). Reading it
 * here exercises the REAL emit → open-link → verify loop; there is no
 * verification backdoor by design (Phase 11 hardening).
 */
/**
 * Django admin lives on the API origin (:8000) — Next never serves /admin in
 * dev or compose. Override with E2E_ADMIN_BASE_URL if the stack is remapped.
 */
export const ADMIN_BASE = process.env.E2E_ADMIN_BASE_URL ?? "http://localhost:8000";

export async function verificationTokenFromLog(email: string, logPath?: string): Promise<string> {
  const path = logPath ?? process.env.E2E_DELIVERY_LOG ?? "/tmp/hem-mail.log";
  const deadline = Date.now() + 30_000; // q2 worker consumes the task asynchronously
  while (Date.now() < deadline) {
    let log: string;
    try {
      log = readFileSync(path, "utf8");
    } catch {
      throw new Error(`delivery log not readable at ${path} — is the mail-emitting process redirected there?`);
    }
    // console-email blocks: headers (Subject/To) followed by the body with the URL
    const blocks = log.split(/(?=Content-Type: text\/plain)/g);
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (!block.includes(email)) continue;
      // token is signed (base64:timestamp:signature) — colons included
      const match = block.match(/verify-email\?token=([A-Za-z0-9._:-]+)/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no verification token emitted for ${email} in ${path} within 30s`);
}

/** Open the real verification link in the app (verify-email page handles it). */
export async function verifyEmail(page: Page, email: string): Promise<void> {
  const token = await verificationTokenFromLog(email);
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByText(/verified|success/i).first()).toBeVisible({ timeout: 20_000 });
}

export async function register(page: Page, name: string, email: string): Promise<void> {
  await test.step(`register ${email}`, async () => {
    await page.goto("/register");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Full name").fill(name);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("long-pass-1234");
      await page.getByTestId("register-submit").click();
      try {
        await page.waitForURL(/\/verify-email/, { timeout: 10_000 });
        return;
      } catch {
        /* hydration may have wiped the fields or navigation is slow — refill */
      }
    }
    throw new Error("register never navigated to /verify-email");
  });
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await test.step(`login ${email}`, async () => {
    await page.goto("/login");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByTestId("login-submit").click();
      try {
        await page.waitForURL(/\/account/, { timeout: 10_000 });
        return;
      } catch {
        /* retry — see register() note */
      }
    }
    throw new Error("login never navigated to /account");
  });
}
