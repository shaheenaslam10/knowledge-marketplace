import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Small self-contained server output for containerized deploys (Phase 13).
  output: "standalone",
  eslint: {
    // lint runs as its own CI step (`npm run lint`) — keep builds fast and deterministic
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
