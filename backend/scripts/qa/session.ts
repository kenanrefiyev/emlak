// QA helper: creates (or reuses) a throw-away user with a disabled password and
// prints a fresh session token. Usage: tsx scripts/qa/session.ts <role> <email>
// Remove with: tsx scripts/qa/session.ts --cleanup
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../../generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  if (process.argv[2] === "--cleanup") {
    const r = await db.user.deleteMany({ where: { email: { endsWith: "@qa.yuva.test" } } });
    console.log(`removed ${r.count} QA users`);
    return;
  }
  const role = (process.argv[2] ?? "USER") as Role;
  const email = process.argv[3] ?? `${role.toLowerCase()}@qa.yuva.test`;
  if (!email.endsWith("@qa.yuva.test")) throw new Error("QA emails must end with @qa.yuva.test");
  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: `QA ${role}`,
      role,
      passwordHash: "disabled",
      emailVerifiedAt: new Date(),
      profile: { create: {} },
      ...(role === "AGENT" ? { agentProfile: { create: { companyName: "QA Agent" } } } : {}),
    },
    update: {},
  });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 86_400_000), userAgent: "qa" },
  });
  console.log(token);
}

main().finally(() => db.$disconnect());
