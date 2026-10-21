import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * Single Prisma client. In development it lives on globalThis so hot reloads do
 * not open new pools; it is keyed by the generated field list so a reload after
 * `prisma generate` replaces a stale client instead of serving one that does
 * not know new columns.
 */
const SCHEMA_KEY = Object.entries(Prisma)
  .filter(([name]) => name.endsWith("ScalarFieldEnum"))
  .map(([name, fields]) => `${name}:${Object.keys(fields as object).join(",")}`)
  .join(";");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaKey?: string };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set: add it to .env locally, or to the hosting environment variables (e.g. Vercel → Settings → Environment Variables).");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: process.env.VERCEL ? 3 : 10 }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaKey === SCHEMA_KEY) return cached;
  void cached?.$disconnect();
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaKey = SCHEMA_KEY;
  }
  return client;
}

export const db = getClient();
