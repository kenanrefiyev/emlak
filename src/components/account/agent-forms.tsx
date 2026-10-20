"use client";

import { useTranslations } from "next-intl";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { requestVerificationAction, updateAgentProfileAction } from "@/app/[locale]/agent/actions";

interface AgentValues {
  companyName: string | null;
  licenseNumber: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  website: string | null;
  about: string | null;
  officeAddress: string | null;
}

export function AgentProfileForm({ values }: { values: AgentValues }) {
  const t = useTranslations("agent");
  const c = useTranslations("common");
  const text = (name: keyof AgentValues, label: string, opts: { type?: string; hint?: string; max?: number } = {}) => (
    <Field name={name} label={label} hint={opts.hint}>
      {(p) => <input {...p} type={opts.type ?? "text"} defaultValue={values[name] ?? ""} maxLength={opts.max ?? 200} className="field" />}
    </Field>
  );
  return (
    <ActionForm action={updateAgentProfileAction} successMessage={t("profileSaved")} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError />
      </div>
      {text("companyName", t("companyName"), { max: 120 })}
      {text("licenseNumber", t("licenseNumber"), { max: 60 })}
      {text("businessPhone", t("businessPhone"), { type: "tel", hint: t("businessPhoneHint") })}
      {text("businessEmail", t("businessEmail"), { type: "email" })}
      {text("website", t("website"), { type: "url" })}
      {text("officeAddress", t("officeAddress"))}
      <Field name="about" label={t("about")} className="sm:col-span-2">
        {(p) => <textarea {...p} rows={5} defaultValue={values.about ?? ""} maxLength={1500} className="field" />}
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{c("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function VerificationForm() {
  const t = useTranslations("agent");
  return (
    <ActionForm action={requestVerificationAction} successMessage={t("verificationSent")} className="space-y-4">
      <FormError />
      <Field name="message" label={t("verificationMessage")} hint={t("verificationMessageHint")} required>
        {(p) => <textarea {...p} rows={5} maxLength={1500} className="field" />}
      </Field>
      <SubmitButton>{t("verificationSubmit")}</SubmitButton>
    </ActionForm>
  );
}
