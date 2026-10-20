"use client";

import { useLocale, useTranslations } from "next-intl";
import { ActionForm, CheckboxField, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/app/[locale]/account/actions";
import { localeNames, locales } from "@/i18n/routing";

interface ProfileValues {
  name: string;
  phone: string | null;
  bio: string | null;
  hometown: string | null;
  universityId: string | null;
  studyYear: number | null;
  sharePhoneOnAccept: boolean;
  preferredLocale: string;
}

export function ProfileForm({ values, universities }: { values: ProfileValues; universities: { value: string; label: string }[] }) {
  const t = useTranslations("account");
  const c = useTranslations("common");
  const a = useTranslations("auth");
  return (
    <ActionForm action={updateProfileAction} successMessage={t("profileSaved")} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError />
      </div>
      <Field name="name" label={a("name")} required>
        {(p) => <input {...p} defaultValue={values.name} autoComplete="name" maxLength={80} className="field" />}
      </Field>
      <Field name="phone" label={a("phone")} hint={a("phoneHint")}>
        {(p) => <input {...p} type="tel" defaultValue={values.phone ?? ""} autoComplete="tel" className="field" />}
      </Field>
      <Field name="hometown" label={t("hometown")}>
        {(p) => <input {...p} defaultValue={values.hometown ?? ""} maxLength={80} className="field" />}
      </Field>
      <Field name="universityId" label={t("university")}>
        {(p) => (
          <select {...p} defaultValue={values.universityId ?? ""} className="field">
            <option value="">—</option>
            {universities.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field name="studyYear" label={t("studyYear")}>
        {(p) => <input {...p} type="number" min={1} max={8} defaultValue={values.studyYear ?? ""} className="field" />}
      </Field>
      <Field name="preferredLocale" label={t("preferredLocale")}>
        {(p) => (
          <select {...p} defaultValue={values.preferredLocale} className="field">
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field name="bio" label={t("bio")} hint={t("bioHint")} className="sm:col-span-2">
        {(p) => <textarea {...p} defaultValue={values.bio ?? ""} rows={4} maxLength={600} className="field" />}
      </Field>
      <div className="sm:col-span-2">
        <CheckboxField name="sharePhoneOnAccept" label={t("sharePhone")} defaultChecked={values.sharePhoneOnAccept} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>{c("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  const t = useTranslations("account");
  const a = useTranslations("auth");
  return (
    <ActionForm action={changePasswordAction} successMessage={t("passwordChanged")} resetOnSuccess className="max-w-md space-y-4">
      <FormError />
      <Field name="currentPassword" label={t("currentPassword")} required>
        {(p) => <input {...p} type="password" autoComplete="current-password" className="field" />}
      </Field>
      <Field name="password" label={t("newPassword")} hint={a("passwordHint")} required>
        {(p) => <input {...p} type="password" autoComplete="new-password" className="field" />}
      </Field>
      <Field name="passwordConfirm" label={a("passwordConfirm")} required>
        {(p) => <input {...p} type="password" autoComplete="new-password" className="field" />}
      </Field>
      <SubmitButton>{t("changePassword")}</SubmitButton>
    </ActionForm>
  );
}

export function DeleteAccountForm() {
  const t = useTranslations("account");
  const locale = useLocale();
  return (
    <ActionForm action={deleteAccountAction} confirm={t("deleteAccountLead")} className="max-w-md space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <FormError />
      <Field name="password" label={t("deleteAccountConfirm")} required>
        {(p) => <input {...p} type="password" autoComplete="current-password" className="field" />}
      </Field>
      <SubmitButton className="btn btn-danger">{t("deleteAccount")}</SubmitButton>
    </ActionForm>
  );
}
