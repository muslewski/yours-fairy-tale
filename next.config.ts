import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every route. A strict Content-Security-
 * Policy is intentionally omitted here — it needs careful per-app tuning around
 * Stripe, the Payload admin, and inline styles, and a wrong CSP silently breaks
 * the site. These headers are the safe, high-value hardening set.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withPayload(nextConfig);
