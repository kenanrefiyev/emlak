"use client";

import { useLocale, useTranslations } from "next-intl";
import { MailWarning } from "lucide-react";
import { ActionForm, useFormState } from "@/components/forms/action-form";
import { resendVerificationAction } from "@/app/[locale]/(auth)/actions";

function Inner() {
  const t = useTranslations("auth");
  const e = useTranslations("errors");
  const { state, pending } = useFormState();
  return (
    <>
      <p className="flex items-center gap-2">
        <MailWarning className="size-4 shrink-0" aria-hidden />
        {t("verifyBanner")}
      </p>
      {state.status === "ok" ? (
        <p role="status" className="font-semibold">
          {state.data?.delivered === false ? t("verifyNotSent") : t("verifySent")}
        </p>
      ) : (
        <button type="submit" disabled={pending} className="font-semibold underline">
          {t("verifyResend")}
        </button>
      )}
      {state.status === "error" && <p role="alert">{e.has(state.code as never) ? e(state.code as "generic") : e("generic")}</p>}
    </>
  );
}

export function VerifyBanner() {
  const locale = useLocale();
  return (
    <ActionForm action={resendVerificationAction} className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <input type="hidden" name="locale" value={locale} />
      <Inner />
    </ActionForm>
  );
}
