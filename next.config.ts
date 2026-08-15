import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder photography only. When the real photos land in /public/hero/
    // this block can go with them — see src/content/hero-slides.ts.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    // Next 16 requires an explicit allowlist; any other value falls back to the
    // nearest allowed one.
    qualities: [62, 70, 75],
  },
};

export default nextConfig;
