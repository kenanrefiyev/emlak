"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authenticate, registerUser, requestPasswordReset, resetPassword, sendVerificationEmail, type EmailCopy } from "@/server/auth/service";
import { endSession, getCurrentUser, safeNext, startSession } from "@/server/auth/current";
import { clientIp } from "@/server/request-info";
import { failure, localeFrom, str } from "@/server/action-utils";
import { formObject } from "@/lib/validation/helpers";
import { ServiceError, type ActionState } from "@/server/errors";
import { mailConfigured } from "@/server/mail";
import type { AppLocale } from "@/i18n/routing";

async function emailCopy(locale: AppLocale): Promise<EmailCopy> {
  const t = await getTranslations({ locale, namespace: "emails" });
  return {
    verifySubject: t("verifySubject"),
    verifyBody: (link) => t("verifyBody", { link }),
    resetSubject: t("resetSubject"),
    resetBody: (link) => t("resetBody", { link }),
  };
}

function homeFor(role: string, locale: AppLocale) {
  return role === "AGENT" ? `/${locale}/agent` : `/${locale}/account`;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  let destination: string;
  try {
    const user = await authenticate(formObject(formData), await clientIp());
    await startSession(user.id);
    destination = safeNext(str(formData, "next"), homeFor(user.role, locale));
    // Admins land in the admin panel unless they were heading somewhere specific.
    if (user.role === "ADMIN" && !str(formData, "next")) destination = "/admin";
  } catch (err) {
    return failure(err);
  }
  redirect(destination);
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  let destination: string;
  try {
    const user = await registerUser(formObject(formData), { ip: await clientIp(), locale, copy: await emailCopy(locale) });
    await startSession(user.id);
    const type = str(formData, "accountType");
    const home = type === "AGENT" ? `/${locale}/dashboard/profile?welcome=1` : type === "OWNER" ? `/${locale}/dashboard?welcome=1` : `/${locale}/account?welcome=1`;
    destination = safeNext(str(formData, "next"), home);
  } catch (err) {
    return failure(err);
  }
  redirect(destination);
}

export async function logoutAction(locale: AppLocale) {
  await endSession();
  redirect(`/${locale}`);
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  try {
    await requestPasswordReset(formObject(formData), { ip: await clientIp(), locale, copy: await emailCopy(locale) });
    return { status: "ok", data: { mail: mailConfigured() } };
  } catch (err) {
    return failure(err);
  }
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  try {
    await resetPassword(formObject(formData));
  } catch (err) {
    return failure(err);
  }
  redirect(`/${locale}/login?reset=1`);
}

export async function resendVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  try {
    const user = await getCurrentUser();
    if (!user) throw new ServiceError("unauthorized");
    if (user.emailVerifiedAt) return { status: "ok" };
    const { rateLimit } = await import("@/server/rate-limit");
    if (!(await rateLimit(`verify:user:${user.id}`, 3, 3_600_000))) throw new ServiceError("rate_limited");
    const result = await sendVerificationEmail(user.id, user.email, locale, await emailCopy(locale));
    return { status: "ok", data: { delivered: result.delivered } };
  } catch (err) {
    return failure(err);
  }
}
