import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { createSessionRecord, deleteSessionByToken, findSessionUser, SESSION_COOKIE, type SessionUser } from "./sessions";
import { userAgent } from "@/server/request-info";
import type { AppLocale } from "@/i18n/routing";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionUser(token);
});

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSessionRecord(userId, await userAgent());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionByToken(token);
  jar.delete(SESSION_COOKIE);
}

export async function currentSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Only same-site relative paths are accepted as post-login destinations. */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  return next;
}

export async function requireUser(locale: AppLocale, next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const qs = next ? `?next=${encodeURIComponent(safeNext(next, `/${locale}/account`))}` : "";
    redirect(`/${locale}/login${qs}`);
  }
  return user;
}

export async function requireRole(locale: AppLocale, roles: Role[], next?: string) {
  const user = await requireUser(locale, next);
  if (!roles.includes(user.role)) redirect(`/${locale}/account`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/emlk-xyz/giris");
  if (user.role !== "ADMIN") redirect("/emlk-xyz/giris?xeta=icaze");
  return user;
}

/** For server actions: returns the user or null without redirecting. */
export async function actionUser() {
  return getCurrentUser();
}
