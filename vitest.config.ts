import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/…" paths in tsconfig.json.
      "@/app": path.resolve(import.meta.dirname, "frontend/app"),
      "@/components": path.resolve(import.meta.dirname, "frontend/components"),
      "@/i18n": path.resolve(import.meta.dirname, "frontend/i18n"),
      "@/server": path.resolve(import.meta.dirname, "backend/server"),
      "@/lib": path.resolve(import.meta.dirname, "backend/lib"),
      "@/generated": path.resolve(import.meta.dirname, "backend/generated"),
      // `server-only` throws outside the React Server build; tests import server modules directly.
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/env.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
