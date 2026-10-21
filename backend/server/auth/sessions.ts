import "server-only";
import { db } from "@/server/db";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "yuva_session";
export const SESSION_DAYS = 30;

export const sessionUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  preferredLocale: true,
} as const;

export async function createSessionRecord(userId: string, userAgent: string | null) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, userAgent, expiresAt } });
  return { token, expiresAt };
}

export async function findSessionUser(token: string) {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, user: { select: sessionUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function deleteSessionByToken(token: string) {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function deleteAllSessions(userId: string, exceptToken?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptToken ? { NOT: { tokenHash: hashToken(exceptToken) } } : {}) },
  });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof findSessionUser>>>;
