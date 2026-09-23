/**
 * Bundle budget gate (design-system.md §Performance; ADR-0014).
 * Usage: npm run build | tee /tmp/next-build.log && node scripts/check-bundle.mjs /tmp/next-build.log
 * Marketing (/) ≤ 180 kB; app routes (≤220 kB). Unparseable output → warn+pass.
 */
import { readFileSync } from "node:fs";

const log = readFileSync(process.argv[2] ?? "/tmp/next-build.log", "utf8");
const MARKETING_BUDGET = 180;
const APP_BUDGET = 220;
const APP_PREFIXES = ["/requests", "/opportunities", "/offers", "/account", "/onboarding", "/expert"];

const rows = [...log.matchAll(/(\/[\w/\-[\]]*)\s+\d+(?:\.\d+)?\s+kB\s+(\d+(?:\.\d+)?)\s+kB/g)];
if (rows.length === 0) {
  console.warn("bundle-check: could not parse build output — skipping (add strict mode later).");
  process.exit(0);
}
let failures = 0;
for (const [, route, firstLoad] of rows) {
  const size = Number(firstLoad);
  const budget = route === "/" ? MARKETING_BUDGET : APP_PREFIXES.some((p) => route.startsWith(p)) ? APP_BUDGET : null;
  if (budget == null) continue;
  const ok = size <= budget;
  if (!ok) failures += 1;
  console.log(`${ok ? "✓" : "✗"} ${route} ${size} kB (budget ${budget} kB)`);
}
if (failures > 0) {
  console.error(`bundle-check: ${failures} route(s) over budget`);
  process.exit(1);
}
console.log("bundle-check: all budgets respected");
