"use client";

import { ActionForm, CheckboxField, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { referenceAction } from "@/app/admin/actions";

export type RefField =
  | { name: string; label: string; type: "text"; required?: boolean; hint?: string }
  | { name: string; label: string; type: "number"; hint?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean }
  | { name: string; label: string; type: "checkbox" };

const NAME_FIELDS: RefField[] = [
  { name: "nameAz", label: "Ad (az)", type: "text", required: true },
  { name: "nameTr", label: "Ad (tr)", type: "text", required: true },
  { name: "nameRu", label: "Ad (ru)", type: "text", required: true },
  { name: "nameEn", label: "Ad (en)", type: "text", required: true },
];

/** Create/edit form for a district, neighborhood, metro station, university or amenity. */
export function ReferenceForm({
  kind,
  id,
  values = {},
  fields,
  withSlug = true,
  submitLabel,
}: {
  kind: "district" | "neighborhood" | "metro" | "university" | "amenity";
  id?: string;
  values?: Record<string, unknown>;
  fields: RefField[];
  withSlug?: boolean;
  submitLabel?: string;
}) {
  const all: RefField[] = [
    ...(withSlug ? [{ name: "slug", label: "Slug (URL)", type: "text", required: true, hint: "kiçik latın hərfləri və tire, məs. genclik" } as RefField] : []),
    ...NAME_FIELDS,
    ...fields,
  ];
  const v = (n: string) => {
    const x = values[n];
    return typeof x === "string" || typeof x === "number" ? String(x) : "";
  };
  return (
    <ActionForm action={referenceAction} successMessage="Yadda saxlanıldı." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="kind" value={kind} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="sm:col-span-2 lg:col-span-3">
        <FormError />
      </div>
      {all.map((f) =>
        f.type === "checkbox" ? (
          <div key={f.name} className="self-end">
            <CheckboxField name={f.name} label={f.label} defaultChecked={values[f.name] === true} />
          </div>
        ) : (
          <Field key={f.name} name={f.name} label={f.label} required={"required" in f ? f.required : false} hint={"hint" in f ? f.hint : undefined}>
            {(p) =>
              f.type === "select" ? (
                <select {...p} defaultValue={v(f.name)} className="field !min-h-11">
                  {!f.required && <option value="">—</option>}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input {...p} type={f.type === "number" ? "number" : "text"} step="any" defaultValue={v(f.name)} className="field !min-h-11" />
              )
            }
          </Field>
        ),
      )}
      <div className="flex items-end">
        <SubmitButton className="btn btn-primary btn-sm !min-h-11">{submitLabel ?? (id ? "Yadda saxla" : "Əlavə et")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
