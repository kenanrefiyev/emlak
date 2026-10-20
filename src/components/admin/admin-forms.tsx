"use client";

import { ActionForm, CheckboxField, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { featureByIdAction, packageAction, settingsAction } from "@/app/admin/actions";


export function PackageForm({ values }: { values?: Record<string, unknown> & { id?: string } }) {
  const v = (n: string) => (values && (typeof values[n] === "string" || typeof values[n] === "number") ? String(values[n]) : "");
  const text = (name: string, label: string, type = "text") => (
    <Field key={name} name={name} label={label} required>
      {(p) => <input {...p} type={type} defaultValue={v(name)} className="field !min-h-11" />}
    </Field>
  );
  return (
    <ActionForm action={packageAction} successMessage="Paket saxlanıldı." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {values?.id && <input type="hidden" name="id" value={values.id} />}
      <div className="sm:col-span-2 lg:col-span-4">
        <FormError />
      </div>
      {text("code", "Kod")}
      {text("nameAz", "Ad (az)")}
      {text("nameTr", "Ad (tr)")}
      {text("nameRu", "Ad (ru)")}
      {text("nameEn", "Ad (en)")}
      {text("priceAzn", "Qiymət (₼)", "number")}
      {text("durationDays", "Müddət (gün)", "number")}
      {text("listingLimit", "Aktiv elan limiti", "number")}
      {text("featuredSlots", "VIP yer sayı", "number")}
      <Field name="sortOrder" label="Sıra">
        {(p) => <input {...p} type="number" defaultValue={v("sortOrder")} className="field !min-h-11" />}
      </Field>
      <div className="self-end">
        <CheckboxField name="isActive" label="Aktivdir (maklerlərə göstərilir)" defaultChecked={values ? values.isActive === true : true} />
      </div>
      <div className="flex items-end">
        <SubmitButton className="btn btn-primary btn-sm !min-h-11">{values?.id ? "Yadda saxla" : "Paket əlavə et"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function FeatureForm() {
  return (
    <ActionForm action={featureByIdAction} successMessage="Elan VIP edildi." resetOnSuccess className="flex flex-wrap items-end gap-4">
      <div className="w-full">
        <FormError />
      </div>
      <Field name="listingId" label="Elanın ID-si" required className="min-w-72 flex-1">
        {(p) => <input {...p} className="field !min-h-11" />}
      </Field>
      <Field name="days" label="Gün" required className="w-28">
        {(p) => <input {...p} type="number" min={1} max={90} defaultValue="7" className="field !min-h-11" />}
      </Field>
      <SubmitButton className="btn btn-primary btn-sm !min-h-11">VIP et</SubmitButton>
    </ActionForm>
  );
}

export function SettingsForm({ values }: { values: Record<string, string | number> }) {
  const num = (name: string, label: string, hint?: string) => (
    <Field name={name} label={label} hint={hint} required>
      {(p) => <input {...p} type="number" defaultValue={String(values[name] ?? "")} className="field !min-h-11" />}
    </Field>
  );
  return (
    <ActionForm action={settingsAction} successMessage="Tənzimləmələr saxlanıldı." className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError />
      </div>
      {num("listingTtlDays", "Kirayə elanının aktiv müddəti (gün)", "Təsdiqdən sonra elan bu qədər gün axtarışda qalır.")}
      {num("roommateTtlDays", "Ev yoldaşı elanının aktiv müddəti (gün)")}
      {num("userListingLimit", "Tələbə və ev sahibi üçün aktiv elan limiti")}
      {num("agentFreeListingLimit", "Paketsiz makler üçün aktiv elan limiti")}
      {num("featuredDays", "Paketdən VIP müddəti (gün)")}
      <Field name="contactEmail" label="Əlaqə e-poçtu" hint="Boş qalsa, saytda göstərilmir.">
        {(p) => <input {...p} type="email" defaultValue={String(values.contactEmail ?? "")} className="field !min-h-11" />}
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>Yadda saxla</SubmitButton>
      </div>
    </ActionForm>
  );
}
