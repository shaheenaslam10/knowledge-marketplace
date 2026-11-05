import type { NextConfig } from "next";

// Static security headers only.
//
// Content-Security-Policy is deliberately NOT set here: it carries a
// per-request nonce and is emitted from `src/middleware.ts` (Phase 12, audit
// F-2 — ADR-0017). Two sources for one header is exactly how a nonce ends up
// disagreeing with the HTML it was supposed to authorise.
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Small self-contained server output for containerized deploys
  // (docker-compose.prod.yml `web` service — ADR-0016).
  output: "standalone",
  eslint: {
    // lint runs as its own CI step (`npm run lint`) — keep builds fast and deterministic
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
