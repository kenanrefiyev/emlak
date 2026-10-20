import { z } from "zod";

/**
 * Validation messages are translation keys under `validation.*`. Public forms
 * translate them with next-intl; the admin panel maps them via admin copy.
 */
export const V = {
  required: "required",
  tooShort: "tooShort",
  tooLong: "tooLong",
  email: "email",
  phone: "phone",
  number: "number",
  min: "min",
  max: "max",
  date: "date",
  dateFuture: "dateFuture",
  password: "password",
  passwordMatch: "passwordMatch",
  choice: "choice",
  url: "url",
  budgetRange: "budgetRange",
  spacesVsResidents: "spacesVsResidents",
} as const;

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({ error: V.number }).int({ error: V.number }).min(min, { error: V.min }).max(max, { error: V.max }).optional(),
  );

export const requiredInt = (min: number, max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({ error: V.required }).int({ error: V.number }).min(min, { error: V.min }).max(max, { error: V.max }),
  );

export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max, { error: V.tooLong }).optional(),
  );

export const requiredText = (min: number, max: number) =>
  z
    .string({ error: V.required })
    .trim()
    .min(1, { error: V.required })
    .min(min, { error: V.tooShort })
    .max(max, { error: V.tooLong });

export const optionalId = z.preprocess(emptyToUndefined, z.string().max(40).optional());

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const dateString = z
  .string({ error: V.date })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: V.date })
  .refine((s) => !Number.isNaN(Date.parse(s)), { error: V.date });

/** Azerbaijani mobile/landline numbers normalised to +994XXXXXXXXX. */
export function normalizeAzPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const d = digits.replace(/^\+/, "");
  let local: string | null = null;
  if (/^994\d{9}$/.test(d)) local = d.slice(3);
  else if (/^0\d{9}$/.test(d)) local = d.slice(1);
  else if (/^\d{9}$/.test(d)) local = d;
  if (!local || !/^(10|12|50|51|55|60|70|77|99)\d{7}$/.test(local)) return null;
  return `+994${local}`;
}

export const optionalPhone = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z
    .string()
    .transform((v, ctx) => {
      const n = normalizeAzPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: V.phone });
        return z.NEVER;
      }
      return n;
    })
    .optional(),
);

export type FieldErrors = Record<string, string>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message in V ? issue.message : V.required;
  }
  return out;
}

export function formObject(formData: FormData, multi: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = multi.includes(key) ? formData.getAll(key).map(String) : formData.get(key);
  }
  for (const key of multi) out[key] ??= [];
  return out;
}
