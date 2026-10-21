import path from "node:path";
import { loadEnvConfig, updateInitialEnv } from "@next/env";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The Next.js app lives in frontend/, the server code it imports in backend/.
// Both share one package.json, node_modules and .env files at the repo root.
// Next only reads .env files from its project dir, so load the root ones here
// and register them as part of the initial environment, which Next restores
// in every server process it starts.
const repoRoot = path.resolve(import.meta.dirname, "..");
// (parsedEnv holds only keys the real environment does not already set.)
const { parsedEnv } = loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", undefined, true);
if (parsedEnv) updateInitialEnv(parsedEnv);

// next-intl checks this path against the working directory (the repo root for
// `npm run dev`), but Turbopack resolves its alias from the project dir
// (frontend/) — so the alias is set again below, relative to frontend/.
const i18nRequest = path.relative(process.cwd(), path.join(import.meta.dirname, "i18n/request.ts")).replaceAll("\\", "/");
const withNextIntl = createNextIntlPlugin(`./${i18nRequest}`);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Root at the repo (not frontend/) so imports from backend/ resolve; pinned so
  // Turbopack does not walk up into the surrounding home directory.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
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

const config = withNextIntl(nextConfig);
config.turbopack = { ...config.turbopack, resolveAlias: { ...config.turbopack?.resolveAlias, "next-intl/config": "./i18n/request.ts" } };

export default config;
