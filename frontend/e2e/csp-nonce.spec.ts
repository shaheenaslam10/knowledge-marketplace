import { expect, test } from "@playwright/test";

/**
 * CSP nonce regression guard (Phase 12 audit).
 *
 * The enforced production policy is `script-src 'self' 'nonce-<n>'
 * 'strict-dynamic'`. Under `strict-dynamic` the `'self'` source is IGNORED by
 * browsers, so a script tag without the per-request nonce is refused — the
 * page then ships with no JavaScript at all, forms fall back to native GETs
 * and nothing hydrates.
 *
 * A per-request nonce cannot exist in statically prerendered HTML (it is built
 * without a request). The root layout therefore reads a request header to opt
 * every route into dynamic rendering. If someone re-introduces static
 * prerendering for a document route, these tests fail loudly instead of
 * shipping a silently dead page — the header-only assertion in
 * `scripts/smoke_test.sh` cannot catch that, because the header is correct
 * either way; it is the HTML that stops matching it.
 */

const ROUTES = ["/", "/login", "/register", "/experts", "/pricing", "/about"];

for (const route of ROUTES) {
  test(`every script tag on ${route} carries the CSP nonce`, async ({ request, baseURL }) => {
    // Asserted against the RAW HTML on purpose: browsers blank the `nonce`
    // content attribute once parsed (anti-exfiltration), so the DOM cannot
    // tell us what the server actually sent.
    const response = await request.get(new URL(route, baseURL).toString());
    expect(response.status()).toBeLessThan(400);

    const csp = response.headers()["content-security-policy"] ?? "";
    // Only meaningful when the policy is actually enforcing with a nonce.
    test.skip(!csp.includes("nonce-"), "CSP is not enforcing a nonce in this environment");

    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce, "policy must carry a nonce").toBeTruthy();

    const html = await response.text();
    const tags = (html.match(/<script\b[^>]*>/g) ?? []).filter(
      // Data blocks (JSON-LD) are never executed, so `script-src` does not
      // gate them and they are deliberately left un-nonced — nonce-ing them
      // would force `await headers()` into the structured-data helpers.
      (tag) => !/type=["']application\/ld\+json["']/.test(tag),
    );
    expect(tags.length, "page should ship executable scripts").toBeGreaterThan(0);

    const unnonced = tags.filter((tag) => !tag.includes(`nonce="${nonce}"`));
    expect(
      unnonced,
      `un-nonced scripts would be blocked by CSP (is this route statically prerendered?): ${unnonced.join(", ")}`,
    ).toEqual([]);
  });
}

test("the app actually hydrates under the enforced policy", async ({ page }) => {
  const blocked: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText?.includes("csp")) blocked.push(request.url());
  });

  await page.goto("/login");
  // A hydrated React form reacts to input; a dead page keeps the DOM default.
  const email = page.getByLabel("Email");
  await email.fill("hydration-probe@example.com");
  await expect(email).toHaveValue("hydration-probe@example.com");
  await expect(page.getByTestId("login-submit")).toBeEnabled();

  expect(blocked, `CSP blocked resources: ${blocked.join(", ")}`).toEqual([]);
});
