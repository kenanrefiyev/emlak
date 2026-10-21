import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Next.js app lives in frontend/ (backend/ holds the server code).
  { settings: { next: { rootDir: "frontend/" } } },
  globalIgnores(["frontend/.next/**", "out/**", "build/**", "frontend/next-env.d.ts", "backend/generated/**", "backend/storage/**"]),
]);
