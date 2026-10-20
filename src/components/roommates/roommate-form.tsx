"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ActionForm, CheckboxField, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { createRoommateAction, updateRoommateAction } from "@/app/[locale]/account/actions";
import { CLEANING, CONTACT_PREFS, GENDER_PREFS, GUESTS, LISTING_CATEGORIES, SLEEP, SMOKING, type RoommateType } from "@/lib/domain";
import type { LocationOptions } from "@/server/locations";
import { locales } from "@/i18n/routing";

export interface RoommateFormValues {
  id?: string;
  type: RoommateType;
  title: string;
  description: string;
  originalLocale: string;
  monthlyContribution?: number | null;
  accommodationType?: string | null;
  currentResidents?: number | null;
  availableSpaces?: number | null;
  districtId?: string | null;
  neighborhoodId?: string | null;
  metroStationId?: string | null;
  houseRules?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  desiredPropertyType?: string | null;
  groupSize?: number | null;
  preferredDistrictIds: string[];
  universityId?: string | null;
  moveInDate: string;
  durationMonths: number;
  genderPreference: string;
  smoking: string;
  cleaning: string;
  sleepSchedule: string;
  guests: string;
  petsOk: boolean;
  contactPreference: string;
}

export function RoommateForm({ values, options }: { values: RoommateFormValues; options: LocationOptions }) {
  const t = useTranslations("roommateForm");
  const r = useTranslations("roommates");
  const e = useTranslations("enums");
  const cat = useTranslations("categories");
  const c = useTranslations("common");
  const langs = useTranslations("common.languageNames");
  const locale = useLocale();
  const [type, setType] = useState<RoommateType>(values.type);
  const [district, setDistrict] = useState(values.districtId ?? "");
  const editing = Boolean(values.id);
  const v = (x: number | string | null | undefined) => (x == null ? "" : String(x));

  const enumSelect = (name: string, label: string, list: readonly string[], ns: string, value: string, required = true) => (
    <Field name={name} label={label} required={required}>
      {(p) => (
        <select {...p} defaultValue={value} className="field">
          {list.map((k) => (
            <option key={k} value={k}>
              {e(`${ns}.${k}` as Parameters<typeof e>[0])}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <ActionForm action={editing ? updateRoommateAction : createRoommateAction} successMessage={t("updated")} className="space-y-10">
      <input type="hidden" name="locale" value={locale} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <FormError />

      <fieldset>
        <legend className="t-h3 mb-4">{t("typeLabel")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["HAS_PLACE", "SEEKING_PARTNER"] as const).map((k) => (
            <label key={k} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-line-strong p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="radio" name="type" value={k} checked={type === k} onChange={() => setType(k)} className="size-5 accent-brand" />
              <span className="font-medium">{e(`roommateType.${k}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="t-h3 mb-4">{t("sectionAbout")}</legend>
        <Field name="title" label={t("title")} hint={t("titleHint")} required>
          {(p) => <input {...p} defaultValue={values.title} maxLength={120} className="field" />}
        </Field>
        <Field name="description" label={t("description")} hint={t("descriptionHint")} required>
          {(p) => <textarea {...p} defaultValue={values.description} rows={6} maxLength={3000} className="field" />}
        </Field>
        <Field name="originalLocale" label={t("language")} className="max-w-xs">
          {(p) => (
            <select {...p} defaultValue={values.originalLocale} className="field">
              {locales.map((l) => (
                <option key={l} value={l}>
                  {langs(l)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </fieldset>

      {type === "HAS_PLACE" ? (
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="t-h3 mb-4">{t("sectionPlace")}</legend>
          <Field name="monthlyContribution" label={t("contribution")} required>
            {(p) => <input {...p} type="number" inputMode="numeric" min={30} max={20000} defaultValue={v(values.monthlyContribution)} className="field" />}
          </Field>
          <Field name="accommodationType" label={t("homeType")} required>
            {(p) => (
              <select {...p} defaultValue={values.accommodationType ?? ""} className="field">
                <option value="">—</option>
                {LISTING_CATEGORIES.map((k) => (
                  <option key={k} value={k}>
                    {cat(k)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="currentResidents" label={t("currentResidents")} required>
            {(p) => <input {...p} type="number" min={1} max={20} defaultValue={v(values.currentResidents)} className="field" />}
          </Field>
          <Field name="availableSpaces" label={t("availableSpaces")} required>
            {(p) => <input {...p} type="number" min={1} max={10} defaultValue={v(values.availableSpaces ?? 1)} className="field" />}
          </Field>
          <Field name="districtId" label={t("district")} required>
            {(p) => (
              <select {...p} value={district} onChange={(ev) => setDistrict(ev.target.value)} className="field">
                <option value="">—</option>
                {options.districts.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="neighborhoodId" label={t("neighborhood")}>
            {(p) => (
              <select {...p} key={district} defaultValue={values.districtId === district ? (values.neighborhoodId ?? "") : ""} className="field">
                <option value="">{c("any")}</option>
                {options.neighborhoods
                  .filter((n) => n.districtId === district)
                  .map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
              </select>
            )}
          </Field>
          <Field name="metroStationId" label={t("metro")}>
            {(p) => (
              <select {...p} defaultValue={values.metroStationId ?? ""} className="field">
                <option value="">—</option>
                {options.metros.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="houseRules" label={t("houseRules")} hint={t("houseRulesHint")} className="sm:col-span-2">
            {(p) => <textarea {...p} defaultValue={values.houseRules ?? ""} rows={3} maxLength={1000} className="field" />}
          </Field>
        </fieldset>
      ) : (
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="t-h3 mb-4">{t("sectionSearch")}</legend>
          <Field name="budgetMin" label={t("budgetMin")} required>
            {(p) => <input {...p} type="number" inputMode="numeric" min={30} max={20000} defaultValue={v(values.budgetMin)} className="field" />}
          </Field>
          <Field name="budgetMax" label={t("budgetMax")} required>
            {(p) => <input {...p} type="number" inputMode="numeric" min={30} max={20000} defaultValue={v(values.budgetMax)} className="field" />}
          </Field>
          <Field name="desiredPropertyType" label={t("desiredHome")}>
            {(p) => (
              <select {...p} defaultValue={values.desiredPropertyType ?? ""} className="field">
                <option value="">{c("any")}</option>
                {LISTING_CATEGORIES.map((k) => (
                  <option key={k} value={k}>
                    {cat(k)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="groupSize" label={t("groupSize")} hint={t("groupSizeHint")} required>
            {(p) => <input {...p} type="number" min={1} max={6} defaultValue={v(values.groupSize ?? 1)} className="field" />}
          </Field>
          <PreferredDistricts label={t("preferredDistricts")} hint={t("preferredDistrictsHint")} districts={options.districts} selected={values.preferredDistrictIds} />
        </fieldset>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="t-h3 mb-4">{t("sectionLifestyle")}</legend>
        <Field name="universityId" label={t("university")}>
          {(p) => (
            <select {...p} defaultValue={values.universityId ?? ""} className="field">
              <option value="">—</option>
              {options.universities.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field name="moveInDate" label={t("moveIn")} required>
          {(p) => <input {...p} type="date" defaultValue={values.moveInDate} className="field" />}
        </Field>
        <Field name="durationMonths" label={t("duration")} required>
          {(p) => <input {...p} type="number" min={1} max={48} defaultValue={values.durationMonths} className="field" />}
        </Field>
        {enumSelect("genderPreference", t("genderPref"), GENDER_PREFS, "gender", values.genderPreference)}
        {enumSelect("smoking", r("smoking"), SMOKING, "smoking", values.smoking)}
        {enumSelect("cleaning", r("cleaning"), CLEANING, "cleaning", values.cleaning)}
        {enumSelect("sleepSchedule", r("sleep"), SLEEP, "sleep", values.sleepSchedule)}
        {enumSelect("guests", r("guests"), GUESTS, "guests", values.guests)}
        <div className="sm:col-span-2">
          <CheckboxField name="petsOk" label={t("pets")} defaultChecked={values.petsOk} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="t-h3 mb-4">{t("sectionContact")}</legend>
        <Field name="contactPreference" label={t("contactPref")} hint={t("contactPrefHint")}>
          {(p) => (
            <select {...p} defaultValue={values.contactPreference} className="field">
              {CONTACT_PREFS.map((k) => (
                <option key={k} value={k}>
                  {e(`contactPref.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </fieldset>

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        <SubmitButton>{editing ? t("submitEdit") : t("submit")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function PreferredDistricts({ label, hint, districts, selected }: { label: string; hint: string; districts: { value: string; label: string }[]; selected: string[] }) {
  return (
    <Field name="preferredDistrictIds" label={label} hint={hint} required className="sm:col-span-2">
      {(p) => (
        <div role="group" aria-describedby={p["aria-describedby"]} className="flex flex-wrap gap-2">
          {districts.map((d) => (
            <label key={d.value} className="chip cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="checkbox" name="preferredDistrictIds" value={d.value} defaultChecked={selected.includes(d.value)} className="sr-only" />
              {d.label}
            </label>
          ))}
        </div>
      )}
    </Field>
  );
}
