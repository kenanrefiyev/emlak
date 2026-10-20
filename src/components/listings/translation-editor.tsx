"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { saveTranslationAction } from "@/app/[locale]/account/actions";
import type { AppLocale } from "@/i18n/routing";

interface Tr {
  locale: AppLocale;
  title: string;
  description: string;
  paymentTerms: string | null;
}

/** Optional owner-written versions of the listing text in the other public languages. */
export function TranslationEditor({ listingId, original, translations }: { listingId: string; original: AppLocale; translations: Tr[] }) {
  const t = useTranslations("listingForm");
  const f = useTranslations("listingForm");
  const langs = useTranslations("common.languageNames");
  const others = (["az", "tr", "ru", "en"] as const).filter((l) => l !== original);
  const [active, setActive] = useState<AppLocale>(others[0]!);
  const [savedFor, setSavedFor] = useState<AppLocale | null>(null);
  const current = translations.find((x) => x.locale === active);

  return (
    <div>
      <p className="text-ink-2">{t("translationsLead")}</p>
      <div role="tablist" className="mt-4 flex flex-wrap gap-2">
        {others.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={active === l}
            onClick={() => {
              setActive(l);
              setSavedFor(null);
            }}
            className="chip aria-selected:border-ink aria-selected:bg-ink aria-selected:text-white"
          >
            {langs(l)}
            {translations.some((x) => x.locale === l) && <span aria-hidden>•</span>}
          </button>
        ))}
      </div>
      <ActionForm key={active} action={saveTranslationAction} onSuccess={() => setSavedFor(active)} className="mt-5 space-y-4" >
        <input type="hidden" name="id" value={listingId} />
        <input type="hidden" name="targetLocale" value={active} />
        <FormError />
        <Field name="title" label={`${f("title")} — ${langs(active)}`}>
          {(p) => <input {...p} lang={active} defaultValue={current?.title ?? ""} maxLength={120} className="field" />}
        </Field>
        <Field name="description" label={`${f("description")} — ${langs(active)}`}>
          {(p) => <textarea {...p} lang={active} defaultValue={current?.description ?? ""} rows={6} maxLength={5000} className="field" />}
        </Field>
        <Field name="paymentTerms" label={f("paymentTerms")}>
          {(p) => <input {...p} lang={active} defaultValue={current?.paymentTerms ?? ""} maxLength={500} className="field" />}
        </Field>
        <div className="flex items-center gap-3">
          <SubmitButton className="btn btn-outline">{t("saveTranslation")}</SubmitButton>
          {savedFor === active && (
            <p role="status" className="text-sm font-medium text-ok">
              {t("translationSaved")}
            </p>
          )}
        </div>
      </ActionForm>
    </div>
  );
}
