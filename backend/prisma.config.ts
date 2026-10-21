import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7: the connection string lives here, not in schema.prisma. It is used
// only by the CLI (migrate, seed, studio); the app connects in backend/server/db.ts.
// Paths below are relative to this file; the .env file lives in the repo root.
config({ path: path.resolve(import.meta.dirname, "../.env"), quiet: true });

// Migrations need a direct (non-pooled) connection; the Neon integration on
// Vercel provides it as DATABASE_URL_UNPOOLED.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx backend/prisma/seed.ts",
  },
  // `prisma generate` needs no database, so a missing URL must not break install.
  ...(url ? { datasource: { url } } : {}),
});
