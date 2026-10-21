"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ActionForm, CheckboxField, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { requestVerificationDashboardAction, updateDashboardProfileAction, updateDashboardSettingsAction } from "@/app/[locale]/dashboard/actions";
import { SPOKEN_LANGUAGES } from "@/lib/domain";
import { localeNames, locales } from "@/i18n/routing";

export function AvatarUploader({ url, initial }: { url: string | null; initial: string }) {
  const t = useTranslations("dashboard.profile");
  const errs = useTranslations("errors");
  const router = useRouter();
  const [src, setSrc] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const msg = (code: string) => (errs.has(code as never) ? errs(code as "generic") : errs("upload_failed"));

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/account/avatar", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && json.url) {
        setSrc(json.url);
        router.refresh();
      } else setError(msg(json.error ?? "upload_failed"));
    } catch {
      setError(msg("upload_failed"));
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/account/avatar", { method: "DELETE" });
    if (res.ok) {
      setSrc(null);
      router.refresh();
    } else setError(msg("generic"));
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-mist text-3xl font-bold text-brand">
        {src ? <Image src={src} alt={t("photoAlt")} fill sizes="96px" className="object-cover" /> : initial}
      </span>
      <div>
        <div className="flex flex-wrap gap-2">
          <label className={`btn btn-outline btn-sm ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
            <Camera className="size-4" aria-hidden />
            {src ? t("changePhoto") : t("addPhoto")}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
            />
          </label>
          {src && (
            <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => void remove()} disabled={busy}>
              <Trash2 className="size-4" aria-hidden />
              {t("removePhoto")}
            </button>
          )}
        </div>
        <p className="hint mt-1.5">{busy ? t("uploading") : t("photoHint")}</p>
        {error && (
          <p role="alert" className="mt-1 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardProfileForm({ values }: { values: { name: string; phone: string | null; bio: string | null; languages: string[] } }) {
  const t = useTranslations("dashboard.profile");
  const a = useTranslations("auth");
  const c = useTranslations("common");
  return (
    <ActionForm action={updateDashboardProfileAction} successMessage={t("saved")} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError />
      </div>
      <Field name="name" label={t("fullName")} required>
        {(p) => <input {...p} defaultValue={values.name} autoComplete="name" maxLength={80} className="field" />}
      </Field>
      <Field name="phone" label={a("phone")} hint={t("phoneHint")}>
        {(p) => <input {...p} type="tel" defaultValue={values.phone ?? ""} autoComplete="tel" className="field" />}
      </Field>
      <Field name="bio" label={t("bio")} hint={t("bioHint")} className="sm:col-span-2">
        {(p) => <textarea {...p} defaultValue={values.bio ?? ""} rows={4} maxLength={600} className="field" />}
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="label">{t("languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {SPOKEN_LANGUAGES.map((l) => (
            <label key={l} className="chip cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="checkbox" name="languages" value={l} defaultChecked={values.languages.includes(l)} className="sr-only" />
              {t(`lang.${l}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <SubmitButton>{c("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function VerificationRequestForm({ isAgent }: { isAgent: boolean }) {
  const t = useTranslations("dashboard.profile");
  return (
    <ActionForm action={requestVerificationDashboardAction} successMessage={t("verificationSent")} className="space-y-4">
      <FormError />
      <Field name="message" label={t("verificationMessage")} hint={isAgent ? t("verificationHintAgent") : t("verificationHintLandlord")} required>
        {(p) => <textarea {...p} rows={5} maxLength={1500} className="field" />}
      </Field>
      <SubmitButton>{t("verificationSubmit")}</SubmitButton>
    </ActionForm>
  );
}

export function SettingsForm({ values }: { values: { preferredLocale: string; sharePhoneOnAccept: boolean } }) {
  const t = useTranslations("dashboard.settings");
  const c = useTranslations("common");
  return (
    <ActionForm action={updateDashboardSettingsAction} successMessage={t("saved")} className="max-w-xl space-y-5">
      <FormError />
      <Field name="preferredLocale" label={t("language")} hint={t("languageHint")}>
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
      <CheckboxField name="sharePhoneOnAccept" label={t("sharePhone")} hint={t("sharePhoneHint")} defaultChecked={values.sharePhoneOnAccept} />
      <SubmitButton>{c("save")}</SubmitButton>
    </ActionForm>
  );
}
