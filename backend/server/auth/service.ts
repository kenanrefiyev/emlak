import "server-only";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { clearRateLimit, rateLimit } from "@/server/rate-limit";
import { appUrl, sendMail } from "@/server/mail";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { hashToken, newToken } from "./tokens";
import { deleteAllSessions } from "./sessions";
import { changePasswordSchema, loginSchema, registerSchema, resetRequestSchema, resetSchema } from "@/lib/validation/auth";
import { fieldErrorsOf } from "@/lib/validation/helpers";
import type { AppLocale } from "@/i18n/routing";
import type { AuthTokenType } from "@/generated/prisma/client";

const MIN = 60_000;

export interface EmailCopy {
  verifySubject: string;
  verifyBody: (link: string) => string;
  resetSubject: string;
  resetBody: (link: string) => string;
}

async function issueToken(userId: string, type: AuthTokenType, ttlMs: number) {
  const token = newToken();
  await db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  await db.authToken.create({ data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

async function consumeToken(token: string, type: AuthTokenType) {
  const row = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) throw new ServiceError("token_invalid");
  await db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}

export async function registerUser(raw: Record<string, unknown>, ctx: { ip: string; locale: AppLocale; copy: EmailCopy }) {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  if (!(await rateLimit(`register:ip:${ctx.ip}`, 10, 60 * MIN))) throw new ServiceError("rate_limited");
  const v = parsed.data;
  const exists = await db.user.findUnique({ where: { email: v.email }, select: { id: true } });
  if (exists) throw new ServiceError("validation", { email: "emailTaken" });

  const user = await db.user.create({
    data: {
      email: v.email,
      name: v.name,
      phone: v.phone ?? null,
      passwordHash: await hashPassword(v.password),
      role: v.accountType,
      preferredLocale: ctx.locale,
      profile: { create: {} },
      ...(v.accountType === "AGENT" ? { agentProfile: { create: { businessPhone: v.phone ?? null, businessEmail: v.email } } } : {}),
    },
    select: { id: true, email: true },
  });
  await sendVerificationEmail(user.id, user.email, ctx.locale, ctx.copy);
  return user;
}

export async function sendVerificationEmail(userId: string, email: string, locale: AppLocale, copy: EmailCopy) {
  const token = await issueToken(userId, "EMAIL_VERIFY", 48 * 60 * MIN);
  return sendMail({ to: email, subject: copy.verifySubject, text: copy.verifyBody(appUrl(`/${locale}/verify-email/${token}`)) });
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "EMAIL_VERIFY");
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

/**
 * Throttled per email (5 failures / 15 min) and per IP (30 / 15 min). The
 * error never reveals whether the email exists.
 */
export async function authenticate(raw: Record<string, unknown>, ip: string) {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const { email, password } = parsed.data;
  const emailKey = `login:email:${email}`;
  const ipKey = `login:ip:${ip}`;
  const failures = await db.rateLimitHit.count({ where: { key: emailKey, createdAt: { gte: new Date(Date.now() - 15 * MIN) } } });
  if (failures >= 5) throw new ServiceError("rate_limited");
  if (!(await rateLimit(ipKey, 30, 15 * MIN))) throw new ServiceError("rate_limited");

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, status: true, role: true } });
  if (!user) {
    await burnPasswordCheck(password);
    await db.rateLimitHit.create({ data: { key: emailKey } });
    throw new ServiceError("invalid_credentials");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    await db.rateLimitHit.create({ data: { key: emailKey } });
    throw new ServiceError("invalid_credentials");
  }
  if (user.status !== "ACTIVE") throw new ServiceError("suspended");
  await clearRateLimit(emailKey);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

/** Always succeeds from the caller's view, so it cannot be used to probe emails. */
export async function requestPasswordReset(raw: Record<string, unknown>, ctx: { ip: string; locale: AppLocale; copy: EmailCopy }) {
  const parsed = resetRequestSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  if (!(await rateLimit(`reset:ip:${ctx.ip}`, 5, 60 * MIN))) throw new ServiceError("rate_limited");
  if (!(await rateLimit(`reset:email:${parsed.data.email}`, 3, 60 * MIN))) return;
  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, status: true } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueToken(user.id, "PASSWORD_RESET", 60 * MIN);
  await sendMail({ to: user.email, subject: ctx.copy.resetSubject, text: ctx.copy.resetBody(appUrl(`/${ctx.locale}/reset-password/${token}`)) });
}

export async function resetPassword(raw: Record<string, unknown>) {
  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const userId = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await deleteAllSessions(userId);
}

export async function changePassword(userId: string, raw: Record<string, unknown>, keepToken?: string) {
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash)))
    throw new ServiceError("validation", { currentPassword: "wrongPassword" });
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await deleteAllSessions(userId, keepToken);
}

/**
 * Account deletion: removes the user and, by cascade, their listings, ads,
 * saved items, sessions and contact requests. Uploaded images are removed first.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, role: true } });
  if (user.role === "ADMIN") throw new ServiceError("forbidden");
  if (!(await verifyPassword(password, user.passwordHash))) throw new ServiceError("validation", { password: "wrongPassword" });
  const images = await db.listingImage.findMany({ where: { listing: { ownerId: userId } }, select: { storageKey: true, url: true } });
  await db.user.delete({ where: { id: userId } });
  const { storage } = await import("@/server/storage/driver");
  const driver = storage();
  await Promise.allSettled(images.map((i) => driver.remove({ key: i.storageKey, url: i.url })));
}
