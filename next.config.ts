import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The project sits inside a larger home-directory git repo; pin the root so
  // Turbopack does not try to watch the whole tree.
  turbopack: { root: path.resolve(import.meta.dirname) },
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
    // 85 is used by the full-bleed hero so it stays crisp on wide/retina screens.
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
