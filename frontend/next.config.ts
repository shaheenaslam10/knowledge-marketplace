import type { NextConfig } from "next";

// Security headers (Phase 11 audit F-2). CSP ships REPORT-ONLY here and on the
// API: enforcing it on Next needs nonced inline bootstrap scripts — the sweep
// to enforce is a Phase 12 pre-launch gate item (security-audit-phase11.md).
const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next dev + hydration need these; report-only until Phase 12
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Small self-contained server output for containerized deploys (Phase 13).
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
