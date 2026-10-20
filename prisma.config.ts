import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7: the connection string lives here, not in schema.prisma. It is used
// only by the CLI (migrate, seed, studio); the app connects in src/server/db.ts.
config({ quiet: true });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `prisma generate` needs no database, so a missing URL must not break install.
  ...(url ? { datasource: { url } } : {}),
});
