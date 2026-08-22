import type { NextConfig } from "next";

import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Nothing gained by announcing the framework and version to every scanner
  // that passes. Removed rather than faked — a wrong value is its own tell.
  poweredByHeader: false,

  images: {
    // Placeholder photography only. When the real photos land in /public/hero/
    // this block can go with them — see src/content/hero-slides.ts. The CSP's
    // img-src carries the same host and must be shortened at the same time.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    // Next 16 requires an explicit allowlist; any other value falls back to the
    // nearest allowed one.
    qualities: [62, 70, 75],
  },

  /**
   * The request-independent headers.
   *
   * These are here rather than in `src/proxy.ts` so they also cover the static
   * assets the proxy deliberately skips. The CSP is the only header that has to
   * be built per request, because it carries a nonce.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: STATIC_SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
