"use client";

import { useLocale, useTranslations } from "next-intl";
import { ActionForm, Field, FormError, SubmitButton } from "./action-form";
import { supportAction } from "@/app/[locale]/(pages)/contact/actions";

export function SupportForm({ defaults }: { defaults: { name: string; email: string } }) {
  const t = useTranslations("pages");
  const a = useTranslations("auth");
  const locale = useLocale();
  return (
    <ActionForm action={supportAction} successMessage={t("contactSent")} resetOnSuccess className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <div className="sm:col-span-2">
        <FormError />
      </div>
      <Field name="name" label={t("contactName")} required>
        {(p) => <input {...p} defaultValue={defaults.name} autoComplete="name" maxLength={80} className="field" />}
      </Field>
      <Field name="email" label={a("email")} required>
        {(p) => <input {...p} type="email" defaultValue={defaults.email} autoComplete="email" className="field" />}
      </Field>
      <Field name="subject" label={t("contactSubject")} required className="sm:col-span-2">
        {(p) => <input {...p} maxLength={140} className="field" />}
      </Field>
      <Field name="message" label={t("contactMessage")} required className="sm:col-span-2">
        {(p) => <textarea {...p} rows={6} maxLength={3000} className="field" />}
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{t("contactSend")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
