import { execSync } from "node:child_process";
import { config } from "dotenv";

/** Applies migrations and reference data (no demo content) to the test database. */
export default function setup() {
  const env: NodeJS.ProcessEnv = { ...process.env, ...config({ path: ".env.test", quiet: true }).parsed, SEED_DEMO: "0" };
  if (!env.DATABASE_URL?.includes("_test")) throw new Error("Refusing to run tests against a non-test database");
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
