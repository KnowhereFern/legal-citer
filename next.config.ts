import type { NextConfig } from "next";
import path from "node:path";

// Security headers applied to every route. These are baseline defenses —
// none of them were present before, leaving the app exposed to clickjacking
// (no X-Frame-Options / CSP frame-ancestors), MIME-sniffing attacks
// (no X-Content-Type-Options), downgrade attacks (no HSTS), and the default
// `X-Powered-By: Next.js` leak (useful fingerprinting signal for attackers).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  // Don't leak the framework fingerprint.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
