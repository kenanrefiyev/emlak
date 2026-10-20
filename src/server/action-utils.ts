import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ServiceError, type ActionState } from "@/server/errors";
import { isLocale, type AppLocale, defaultLocale } from "@/i18n/routing";

/** Converts thrown errors into a serialisable action state. Redirects pass through. */
export function failure(err: unknown): ActionState {
  if (isRedirectError(err)) throw err;
  if (err instanceof ServiceError) return { status: "error", code: err.code, fieldErrors: err.fieldErrors };
  console.error("[action]", err);
  return { status: "error", code: "generic" };
}

export function localeFrom(formData: FormData): AppLocale {
  const v = formData.get("locale");
  return isLocale(v) ? v : defaultLocale;
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}
