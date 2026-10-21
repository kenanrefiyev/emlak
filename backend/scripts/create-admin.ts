/**
 * Creates or promotes an administrator. No default admin exists anywhere.
 *   npm run admin:create -- --email you@example.com --name "Ad Soyad"
 * The password comes from ADMIN_PASSWORD; if it is not set, a random one is
 * generated and printed once.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Administrator";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run admin:create -- --email you@example.com --name "Ad Soyad"');
    process.exit(1);
  }
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exit(1);
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name, role: "ADMIN", passwordHash, emailVerifiedAt: new Date(), profile: { create: {} } },
    update: { role: "ADMIN", status: "ACTIVE", passwordHash },
  });
  await db.auditLog.create({ data: { actorId: null, action: "admin.create", entityType: "user", entityId: user.id, metadata: { via: "cli" } } });
  await db.$disconnect();
  console.log(`Administrator ready: ${email}`);
  if (generated) console.log(`Generated password (shown once): ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
