"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ActionForm, Field, FormError, FormSuccess, SubmitButton, useFieldError } from "@/components/forms/action-form";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/[locale]/(auth)/actions";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  return (
    <ActionForm action={loginAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormError />
      <Field name="email" label={t("email")} required>
        {(p) => <input {...p} type="email" autoComplete="email" className="field" />}
      </Field>
      <Field name="password" label={t("password")} required>
        {(p) => <input {...p} type="password" autoComplete="current-password" className="field" />}
      </Field>
      <div className="flex items-center justify-between gap-3">
        <SubmitButton>{t("submitLogin")}</SubmitButton>
        <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
          {t("forgot")}
        </Link>
      </div>
    </ActionForm>
  );
}

function TermsCheckbox() {
  const t = useTranslations("auth");
  const error = useFieldError("acceptTerms");
  return (
    <div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input type="checkbox" name="acceptTerms" className="mt-0.5 size-5 shrink-0 accent-brand" aria-invalid={Boolean(error)} />
        <span className="text-[0.9375rem] leading-snug">
          {t.rich("acceptTerms", {
            terms: (chunks) => (
              <Link href="/terms" target="_blank" className="font-semibold text-brand underline">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" target="_blank" className="font-semibold text-brand underline">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {error && <p className="text-[0.8125rem] font-medium text-danger">{error}</p>}
    </div>
  );
}

export function RegisterForm({ next, defaultType }: { next?: string; defaultType: "USER" | "OWNER" | "AGENT" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [type, setType] = useState(defaultType);
  return (
    <ActionForm action={registerAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormError />
      <fieldset>
        <legend className="label">{t("accountType")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["USER", "OWNER", "AGENT"] as const).map((k) => (
            <label key={k} className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong px-3 py-2 text-sm font-medium has-[:checked]:border-ink has-[:checked]:bg-mist">
              <input type="radio" name="accountType" value={k} checked={type === k} onChange={() => setType(k)} className="size-4 accent-brand" />
              {t(`accountTypes.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field name="name" label={t("name")} required>
        {(p) => <input {...p} autoComplete="name" maxLength={80} className="field" />}
      </Field>
      <Field name="email" label={t("email")} required>
        {(p) => <input {...p} type="email" autoComplete="email" className="field" />}
      </Field>
      <Field name="phone" label={t("phone")} hint={t("phoneHint")}>
        {(p) => <input {...p} type="tel" autoComplete="tel" inputMode="tel" placeholder="050 123 45 67" className="field" />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="password" label={t("password")} hint={t("passwordHint")} required>
          {(p) => <input {...p} type="password" autoComplete="new-password" className="field" />}
        </Field>
        <Field name="passwordConfirm" label={t("passwordConfirm")} required>
          {(p) => <input {...p} type="password" autoComplete="new-password" className="field" />}
        </Field>
      </div>
      <TermsCheckbox />
      <SubmitButton className="btn btn-primary w-full">{t("submitRegister")}</SubmitButton>
    </ActionForm>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [done, setDone] = useState<null | boolean>(null);
  if (done !== null) {
    return (
      <div>
        <FormSuccess message={t("forgotDone")} />
        {!done && <p className="mt-3 text-sm text-ink-2">{t("forgotNoMail")}</p>}
      </div>
    );
  }
  return (
    <ActionForm action={forgotPasswordAction} onSuccess={(s) => setDone(Boolean(s.status === "ok" && s.data?.mail))} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <FormError />
      <Field name="email" label={t("email")} required>
        {(p) => <input {...p} type="email" autoComplete="email" className="field" />}
      </Field>
      <SubmitButton>{t("forgotSubmit")}</SubmitButton>
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  return (
    <ActionForm action={resetPasswordAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <FormError />
      <Field name="password" label={t("password")} hint={t("passwordHint")} required>
        {(p) => <input {...p} type="password" autoComplete="new-password" className="field" />}
      </Field>
      <Field name="passwordConfirm" label={t("passwordConfirm")} required>
        {(p) => <input {...p} type="password" autoComplete="new-password" className="field" />}
      </Field>
      <SubmitButton>{t("resetSubmit")}</SubmitButton>
    </ActionForm>
  );
}
