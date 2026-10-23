"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, ImageOff, Lock, MapPin, ShieldCheck } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { ActionForm, CheckboxField, Field, FormError, SubmitButton, useFormState } from "@/components/forms/action-form";
import { PhotoManager } from "@/components/listings/photo-manager";
import { TranslationEditor } from "@/components/listings/translation-editor";
import { NearbyMap } from "@/components/listings/nearby-map";
import { AmenityIcon } from "@/components/listings/amenity-icon";
import { OpButton } from "@/components/account/op-button";
import { saveListingAction } from "@/app/[locale]/dashboard/actions";
import { listingOpAction } from "@/app/[locale]/account/actions";
import {
  COMMISSION_TYPES,
  CONTACT_PREFS,
  FURNISHING,
  GENDER_PREFS,
  HEATING,
  LISTING_CATEGORIES,
  PROPERTY_TYPES,
  SHARED_CATEGORIES,
  UTILITIES,
  WHOLE_UNIT_CATEGORIES,
  type ListingCategory,
} from "@/lib/domain";
import { approxPosition, distanceKm, UNIVERSITY_COORDS } from "@/lib/baku-geo";
import type { LocationOptions } from "@/server/locations";
import { locales } from "@/i18n/routing";
import type { ActionState } from "@/server/errors";

export interface WizardValues {
  category: ListingCategory;
  propertyType: string;
  title: string;
  description: string;
  paymentTerms: string;
  rules: string;
  originalLocale: string;
  monthlyRent: number | "";
  pricePerPlace: boolean;
  deposit: number | null;
  commissionType: string;
  commissionValue: number | null;
  utilitiesCost: number | null;
  internetCost: number | null;
  otherCosts: number | null;
  otherCostsNote: string | null;
  costSharers: number | null;
  districtId: string;
  neighborhoodId: string | null;
  metroStationId: string | null;
  universityId: string | null;
  addressPrivate: string | null;
  addressPublic: string | null;
  rooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  floor: number | null;
  totalFloors: number | null;
  residentsCount: number | null;
  availableSpaces: number | null;
  furnishing: string;
  utilities: string;
  internet: boolean;
  heating: string;
  airConditioning: boolean;
  genderPreference: string;
  availableFrom: string;
  minDurationMonths: number;
  videoUrl: string | null;
  amenityIds: string[];
  contactName: string | null;
  contactPhone: string | null;
  contactWhatsapp: boolean;
  contactPreference: string;
}

interface Img {
  id: string;
  url: string;
  width: number;
  height: number;
}

const STEPS = ["basics", "location", "details", "conditions", "photos", "contact", "review"] as const;
type StepKey = (typeof STEPS)[number];
const FORM_STEPS: StepKey[] = ["basics", "location", "details", "conditions", "contact"];

/** Which step owns a server-side field error. */
const FIELD_STEP: Record<string, StepKey> = {
  category: "basics",
  propertyType: "basics",
  title: "basics",
  description: "basics",
  originalLocale: "basics",
  monthlyRent: "basics",
  pricePerPlace: "basics",
  districtId: "location",
  neighborhoodId: "location",
  metroStationId: "location",
  universityId: "location",
  addressPublic: "location",
  addressPrivate: "location",
  rooms: "details",
  bathrooms: "details",
  areaSqm: "details",
  floor: "details",
  totalFloors: "details",
  residentsCount: "details",
  availableSpaces: "details",
  furnishing: "details",
  heating: "details",
  internet: "details",
  airConditioning: "details",
  amenityIds: "details",
  genderPreference: "details",
  deposit: "conditions",
  commissionType: "conditions",
  commissionValue: "conditions",
  utilities: "conditions",
  utilitiesCost: "conditions",
  internetCost: "conditions",
  otherCosts: "conditions",
  otherCostsNote: "conditions",
  costSharers: "conditions",
  minDurationMonths: "conditions",
  availableFrom: "conditions",
  paymentTerms: "conditions",
  rules: "conditions",
  videoUrl: "conditions",
  contactName: "contact",
  contactPhone: "contact",
  contactWhatsapp: "contact",
  contactPreference: "contact",
};

const DRAFT_KEY = "yuva:new-listing";

// Whether a draft existed when the page was first opened; typing afterwards
// rewrites the draft but must not make the "restore" offer reappear.
let draftAtLoad: boolean | null = null;
function readDraftAtLoad() {
  if (draftAtLoad === null) {
    try {
      draftAtLoad = window.localStorage.getItem(DRAFT_KEY) !== null;
    } catch {
      draftAtLoad = false;
    }
  }
  return draftAtLoad;
}

function forgetDraft() {
  draftAtLoad = false;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage blocked: nothing to remove */
  }
}

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

/** Jumps to the first step that has a server-side field error. */
function ErrorJumper({ onJump }: { onJump: (step: StepKey) => void }) {
  const { state } = useFormState();
  const last = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.status !== "error" || !state.fieldErrors) return;
    const steps = Object.keys(state.fieldErrors)
      .map((f) => FIELD_STEP[f])
      .filter((s): s is StepKey => Boolean(s))
      .sort((a, b) => STEPS.indexOf(a) - STEPS.indexOf(b));
    if (steps[0]) onJump(steps[0]);
  }, [state, onJump]);
  return null;
}

export function ListingWizard({
  listingId,
  values,
  options,
  images = [],
  initialStep = "basics",
  status,
  canSubmit,
  rejectionReason,
  ttlDays,
  isAgent,
  translations,
  justCreated,
}: {
  listingId?: string;
  values: WizardValues;
  options: LocationOptions;
  images?: Img[];
  initialStep?: StepKey;
  status?: string;
  canSubmit?: boolean;
  rejectionReason?: string | null;
  ttlDays: number;
  isAgent: boolean;
  translations?: { locale: string; title: string; description: string; paymentTerms: string | null }[];
  justCreated?: boolean;
}) {
  const t = useTranslations("dashboard.wizard");
  const lf = useTranslations("listingForm");
  const cat = useTranslations("categories");
  const hints = useTranslations("categoryHints");
  const e = useTranslations("enums");
  const c = useTranslations("common");
  const d = useTranslations("dashboard");
  const langs = useTranslations("common.languageNames");
  const locale = useLocale();
  const router = useRouter();
  const formId = "listing-wizard";
  const isNew = !listingId;

  const [step, setStep] = useState<StepKey>(initialStep);
  const [category, setCategory] = useState<ListingCategory>(values.category);
  const [district, setDistrict] = useState(values.districtId);
  const [neighborhood, setNeighborhood] = useState(values.neighborhoodId ?? "");
  const [metro, setMetro] = useState(values.metroStationId ?? "");
  const [university, setUniversity] = useState(values.universityId ?? "");
  const [commission, setCommission] = useState(values.commissionType);
  const [contactPref, setContactPref] = useState(values.contactPreference);
  const [missing, setMissing] = useState<string[]>([]);
  const [savedMsg, setSavedMsg] = useState<string | null>(justCreated ? t("createdNotice") : null);
  const [restored, setRestored] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, string> | null>(null);
  const [photoCount, setPhotoCount] = useState(images.length);
  const intent = useRef<"save" | "next">("save");
  const stepRef = useRef<HTMLDivElement>(null);

  const shared = SHARED_CATEGORIES.includes(category);
  const whole = WHOLE_UNIT_CATEGORIES.includes(category);
  const n = (x: number | null | "") => (x === null || x === "" ? "" : String(x));
  const form = () => document.getElementById(formId) as HTMLFormElement | null;
  const idx = STEPS.indexOf(step);
  const locked = (s: StepKey) => isNew && STEPS.indexOf(s) > STEPS.indexOf("conditions");

  // Keep the URL in sync so a refresh or shared link lands on the same step.
  useEffect(() => {
    if (isNew) return;
    const url = new URL(window.location.href);
    url.searchParams.set("step", step);
    url.searchParams.delete("created");
    window.history.replaceState(null, "", url);
  }, [step, isNew]);

  // ── draft preservation for a listing that does not exist yet ──
  const draftFound = useSyncExternalStore(subscribeStorage, readDraftAtLoad, () => false);
  const [dismissed, setDismissed] = useState(false);
  const hasDraft = isNew && draftFound && !dismissed;

  const restoreDraft = () => {
    let saved: Record<string, string | string[]> | null = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null");
    } catch {
      saved = null;
    }
    const el = form();
    if (!saved || !el) return;
    for (const field of Array.from(el.elements) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[]) {
      if (!field.name || !(field.name in saved) || field.type === "hidden") continue;
      const v = saved[field.name]!;
      if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
        field.checked = Array.isArray(v) ? v.includes(field.value) : field.type === "checkbox" ? v === "on" : v === field.value;
      } else if (typeof v === "string") field.value = v;
    }
    const str = (k: string) => (typeof saved![k] === "string" ? (saved![k] as string) : "");
    if (str("category")) setCategory(str("category") as ListingCategory);
    setDistrict(str("districtId"));
    setNeighborhood(str("neighborhoodId"));
    setMetro(str("metroStationId"));
    setUniversity(str("universityId"));
    if (str("commissionType")) setCommission(str("commissionType"));
    if (str("contactPreference")) setContactPref(str("contactPreference"));
    setRestored(true);
    setDismissed(true);
  };

  const persist = () => {
    if (!isNew) return;
    if (!dismissed) setDismissed(true);
    const el = form();
    if (!el) return;
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of new FormData(el).entries()) {
      if (typeof v !== "string" || k === "locale") continue;
      if (k === "amenityIds") out[k] = [...((out[k] as string[]) ?? []), v];
      else out[k] = v;
    }
    if (!("amenityIds" in out)) out.amenityIds = [];
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(out));
    } catch {
      /* storage full or blocked: the draft is simply not kept */
    }
  };
  const discardDraft = () => {
    forgetDraft();
    setDismissed(true);
    if (restored) window.location.reload();
  };

  const go = (s: StepKey) => {
    setMissing([]);
    setStep(s);
    if (s === "review") {
      const el = form();
      if (el) setSnapshot(Object.fromEntries([...new FormData(el).entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>);
    }
    requestAnimationFrame(() => stepRef.current?.focus({ preventScroll: true }));
    stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Client-side check of the visible step's required fields (the server re-checks everything). */
  const validateStep = (s: StepKey): string[] => {
    const el = form();
    if (!el) return [];
    const fd = new FormData(el);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const num = (k: string) => Number(v(k));
    const miss: string[] = [];
    if (s === "basics") {
      if (v("title").length < 10) miss.push(lf("title"));
      if (v("description").length < 40) miss.push(lf("description"));
      if (!v("monthlyRent") || num("monthlyRent") < 30 || num("monthlyRent") > 20000) miss.push(lf("monthlyRent"));
    }
    if (s === "location" && !v("districtId")) miss.push(lf("district"));
    if (s === "details") {
      if (whole && !v("rooms")) miss.push(lf("rooms"));
      if (shared && !v("availableSpaces")) miss.push(lf("availableSpaces"));
      if (shared && category !== "DORMITORY" && !v("residentsCount")) miss.push(lf("residentsCount"));
    }
    if (s === "conditions") {
      if (!v("availableFrom")) miss.push(lf("availableFrom"));
      if (!v("minDurationMonths")) miss.push(lf("minDurationMonths"));
      if (v("commissionType") !== "NONE" && !v("commissionValue")) miss.push(lf("commissionValue"));
    }
    if (s === "contact" && (v("contactPreference") !== "IN_APP" || fd.get("contactWhatsapp")) && !v("contactPhone")) miss.push(t("contactPhone"));
    return miss;
  };

  const next = () => {
    const miss = validateStep(step);
    setMissing(miss);
    if (miss.length) {
      stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const nextStep = STEPS[idx + 1]!;
    if (FORM_STEPS.includes(step) && (!isNew || step === "conditions")) {
      // Save on the way forward; on a new listing the first save creates the draft.
      intent.current = "next";
      form()?.requestSubmit();
      return;
    }
    go(nextStep);
  };

  const onSaved = (s: ActionState) => {
    if (s.status !== "ok") return;
    const data = s.data as { id?: string; created?: boolean; requeued?: boolean } | undefined;
    if (data?.created && data.id) {
      forgetDraft();
      router.push(`/dashboard/listings/${data.id}/edit?step=photos&created=1`);
      return;
    }
    setSavedMsg(data?.requeued ? lf("requeued") : lf("saved"));
    if (intent.current === "next") go(STEPS[idx + 1]!);
    intent.current = "save";
  };

  // ── location helpers: approximate map point and nearest universities ──
  const slugOf = <T extends { value: string; slug: string }>(list: T[], v: string) => list.find((o) => o.value === v)?.slug;
  const districtSlug = slugOf(options.districts, district);
  const center = useMemo(
    () =>
      approxPosition({
        metroStation: metro ? { slug: slugOf(options.metros, metro) ?? "", latitude: null, longitude: null } : null,
        neighborhood: neighborhood ? { slug: slugOf(options.neighborhoods, neighborhood) ?? "", latitude: null, longitude: null } : null,
        university: university ? { slug: slugOf(options.universities, university) ?? "", latitude: null, longitude: null } : null,
        district: { slug: districtSlug ?? "" },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metro, neighborhood, university, districtSlug],
  );
  const nearestUnis = useMemo(
    () =>
      options.universities
        .map((u) => ({ label: u.short, slug: u.slug, km: UNIVERSITY_COORDS[u.slug] ? distanceKm(center, UNIVERSITY_COORDS[u.slug]!) : null }))
        .filter((u): u is { label: string; slug: string; km: number } => u.km !== null)
        .sort((a, b) => a.km - b.km)
        .slice(0, 3),
    [center, options.universities],
  );
  const mapPoints = useMemo(() => [], []);
  const mapLabels = useMemo(() => ({ thisListing: t("mapThis"), approxArea: t("mapApprox"), open: "" }), [t]);

  const num = (name: keyof WizardValues, label: string, opts: { min?: number; max?: number; required?: boolean; hint?: string } = {}) => (
    <Field name={name} label={label} required={opts.required} hint={opts.hint}>
      {(p) => <input {...p} type="number" inputMode="numeric" min={opts.min} max={opts.max} defaultValue={n(values[name] as number | null)} className="field" />}
    </Field>
  );
  const enumSel = (name: keyof WizardValues, label: string, list: readonly string[], ns: string) => (
    <Field name={name} label={label} required>
      {(p) => (
        <select {...p} defaultValue={values[name] as string} className="field">
          {list.map((k) => (
            <option key={k} value={k}>
              {e(`${ns}.${k}` as Parameters<typeof e>[0])}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
  const grid = "grid gap-5 sm:grid-cols-2";
  const panel = (s: StepKey) => ({ hidden: step !== s });

  const label = (k: string) => {
    const opt = [...options.districts, ...options.neighborhoods, ...options.metros].find((o) => o.value === k);
    return opt?.label;
  };
  // Until the user moves between steps, preview the saved values.
  const snap: Record<string, string> =
    snapshot ??
    Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v !== null && v !== "" && !Array.isArray(v) && typeof v !== "boolean")
        .map(([k, v]) => [k, String(v)]),
    );
  const coverUrl = images[0]?.url;

  return (
    <div>
      {/* Progress */}
      <nav aria-label={t("progress")} className="-mx-1 overflow-x-auto px-1 pb-2">
        <ol className="flex min-w-max gap-1.5">
          {STEPS.map((s, i) => {
            const done = i < idx;
            const isLocked = locked(s);
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => (i <= idx || !isNew ? go(s) : undefined)}
                  aria-current={s === step ? "step" : undefined}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-ink-2 transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 aria-[current=step]:border-brand aria-[current=step]:bg-brand aria-[current=step]:text-white"
                >
                  <span className={`grid size-6 place-items-center rounded-full text-xs ${s === step ? "bg-white/20" : done ? "bg-ok text-white" : "bg-mist"}`}>
                    {isLocked ? <Lock className="size-3" aria-hidden /> : done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  {t(`steps.${s}`)}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-mist" aria-hidden>
        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} />
      </div>

      {restored ? (
        <p className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">
          {t("restored")}
          <button type="button" onClick={discardDraft} className="min-h-9 font-semibold text-brand hover:underline">
            {t("discardDraft")}
          </button>
        </p>
      ) : (
        hasDraft && (
          <p className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">
            {t("draftFound")}
            <button type="button" onClick={restoreDraft} className="btn btn-primary btn-sm">
              {t("restoreDraft")}
            </button>
            <button type="button" onClick={discardDraft} className="min-h-9 font-semibold text-brand hover:underline">
              {t("discardDraft")}
            </button>
          </p>
        )
      )}
      {rejectionReason && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{lf("rejectedReason", { reason: rejectionReason })}</p>}

      <div ref={stepRef} tabIndex={-1} className="scroll-mt-28 outline-none">
        <div className="mt-6">
          <h2 className="t-h3">{t(`steps.${step}`)}</h2>
          <p className="mt-1 text-sm text-ink-2">{t(`stepLead.${step}`)}</p>
        </div>
        {missing.length > 0 && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("missing", { fields: missing.join(", ") })}
          </p>
        )}
      </div>

      <ActionForm
        id={formId}
        action={saveListingAction}
        onSuccess={onSaved}
        className={FORM_STEPS.includes(step) ? "mt-6" : "hidden"}
      >
        <div onInput={persist} onChange={persist}>
          <input type="hidden" name="locale" value={locale} />
          {listingId && <input type="hidden" name="id" value={listingId} />}
          <ErrorJumper onJump={(s) => go(s)} />
          <FormError className="mb-6" />

          {/* 1 — basics */}
          <div {...panel("basics")} className="space-y-8">
            <fieldset>
              <legend className="label">{t("arrangement")}</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LISTING_CATEGORIES.map((k) => (
                  <label key={k} className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-line-strong p-4 transition-colors hover:border-ink has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                    <span className="flex items-center gap-2.5 font-semibold">
                      <input type="radio" name="category" value={k} checked={category === k} onChange={() => setCategory(k)} className="size-4 accent-brand" />
                      {cat(k)}
                    </span>
                    <span className="pl-6.5 text-sm text-ink-2">{hints(k)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">{t("propertyType")}</legend>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((k) => (
                  <label key={k} className="chip cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                    <input type="radio" name="propertyType" value={k} defaultChecked={values.propertyType === k} className="sr-only" />
                    {t(`propertyTypes.${k}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field name="title" label={lf("title")} hint={lf("titleHint")} required>
              {(p) => <input {...p} defaultValue={values.title} maxLength={120} className="field" />}
            </Field>
            <Field name="description" label={lf("description")} hint={lf("descriptionHint")} required>
              {(p) => <textarea {...p} defaultValue={values.description} rows={7} maxLength={5000} className="field" />}
            </Field>
            <div className={grid}>
              {num("monthlyRent", t("monthlyRentAzn"), { min: 30, max: 20000, required: true })}
              <Field name="originalLocale" label={lf("language")}>
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
              {category === "SHARED_APARTMENT" && (
                <div className="sm:col-span-2">
                  <CheckboxField name="pricePerPlace" label={lf("pricePerPlace")} hint={lf("pricePerPlaceHint")} defaultChecked={values.pricePerPlace} />
                </div>
              )}
            </div>
          </div>

          {/* 2 — location */}
          <div {...panel("location")} className="space-y-6">
            <div className={grid}>
              <Field name="districtId" label={lf("district")} required>
                {(p) => (
                  <select
                    {...p}
                    value={district}
                    onChange={(ev) => {
                      setDistrict(ev.target.value);
                      setNeighborhood("");
                    }}
                    className="field"
                  >
                    <option value="">—</option>
                    {options.districts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field name="neighborhoodId" label={lf("neighborhood")}>
                {(p) => (
                  <select {...p} value={neighborhood} onChange={(ev) => setNeighborhood(ev.target.value)} className="field">
                    <option value="">{lf("neighborhoodNone")}</option>
                    {options.neighborhoods
                      .filter((nb) => nb.districtId === district)
                      .map((nb) => (
                        <option key={nb.value} value={nb.value}>
                          {nb.label}
                        </option>
                      ))}
                  </select>
                )}
              </Field>
              <Field name="metroStationId" label={lf("metro")}>
                {(p) => (
                  <select {...p} value={metro} onChange={(ev) => setMetro(ev.target.value)} className="field">
                    <option value="">—</option>
                    {options.metros.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field name="universityId" label={lf("university")}>
                {(p) => (
                  <select {...p} value={university} onChange={(ev) => setUniversity(ev.target.value)} className="field">
                    <option value="">—</option>
                    {options.universities.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field name="addressPublic" label={lf("addressPublic")} hint={lf("addressPublicHint")}>
                {(p) => <input {...p} defaultValue={values.addressPublic ?? ""} maxLength={160} className="field" />}
              </Field>
              <Field name="addressPrivate" label={lf("addressPrivate")} hint={lf("addressPrivateHint")}>
                {(p) => <input {...p} defaultValue={values.addressPrivate ?? ""} maxLength={200} className="field" autoComplete="off" />}
              </Field>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <div>
                <p className="label flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden /> {t("mapTitle")}
                </p>
                {district ? (
                  step === "location" && <NearbyMap center={center} points={mapPoints} labels={mapLabels} />
                ) : (
                  <p className="rounded-2xl bg-mist px-4 py-10 text-center text-sm text-ink-2">{t("mapPick")}</p>
                )}
                <p className="hint mt-2">{t("mapNote")}</p>
              </div>
              <div>
                <p className="label">{t("nearestUnis")}</p>
                {district ? (
                  <ul className="space-y-2 text-sm">
                    {nearestUnis.map((u) => (
                      <li key={u.slug} className="flex justify-between gap-3 rounded-lg bg-mist px-3 py-2">
                        <span className="font-medium">{u.label}</span>
                        <span className="text-ink-2 tabular-nums">≈ {u.km < 1 ? "<1" : u.km.toFixed(1)} km</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-2">—</p>
                )}
                <p className="hint mt-2">{t("distanceNote")}</p>
              </div>
            </div>
          </div>

          {/* 3 — details */}
          <div {...panel("details")} className="space-y-8">
            <div className={grid}>
              {num("rooms", lf("rooms"), { min: 1, max: 20, required: whole })}
              {category !== "DORMITORY" && num("bathrooms", lf("bathrooms"), { min: 0, max: 10 })}
              {category !== "DORMITORY" && num("areaSqm", lf("areaSqm"), { min: 8, max: 1000 })}
              {num("floor", lf("floor"), { min: -2, max: 60 })}
              {num("totalFloors", lf("totalFloors"), { min: 1, max: 60 })}
              {shared && num("residentsCount", lf("residentsCount"), { min: 0, max: 30, required: category !== "DORMITORY" })}
              {shared && num("availableSpaces", t("maxOccupancy"), { min: 1, max: 30, required: true, hint: t("maxOccupancyHint") })}
              {enumSel("furnishing", lf("furnishing"), FURNISHING, "furnishing")}
              {enumSel("heating", lf("heating"), HEATING, "heating")}
              {shared ? enumSel("genderPreference", t("tenantPreference"), GENDER_PREFS, "gender") : <input type="hidden" name="genderPreference" value="ANY" />}
              <div className="space-y-1 self-end sm:col-span-2">
                <CheckboxField name="internet" label={lf("internet")} defaultChecked={values.internet} />
                <CheckboxField name="airConditioning" label={lf("airConditioning")} defaultChecked={values.airConditioning} />
              </div>
            </div>
            <fieldset>
              <legend className="label">{lf("amenities")}</legend>
              <div className="flex flex-wrap gap-2">
                {options.amenities.map((a) => (
                  <label key={a.value} className="chip cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                    <input type="checkbox" name="amenityIds" value={a.value} defaultChecked={values.amenityIds.includes(a.value)} className="sr-only" />
                    <AmenityIcon name={a.icon} className="size-4" />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* 4 — conditions */}
          <div {...panel("conditions")} className={grid}>
            {num("deposit", t("depositAzn"), { min: 0, max: 50000, hint: t("depositHint") })}
            {enumSel("utilities", t("utilitiesIncluded"), UTILITIES, "utilities")}
            <Field name="commissionType" label={lf("commissionType")} hint={isAgent ? t("commissionHintAgent") : undefined}>
              {(p) => (
                <select {...p} value={commission} onChange={(ev) => setCommission(ev.target.value)} className="field">
                  {COMMISSION_TYPES.map((k) => (
                    <option key={k} value={k}>
                      {e(`commission.${k}`)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {commission !== "NONE" ? num("commissionValue", lf("commissionValue"), { min: 0, max: commission === "PERCENT" ? 100 : 50000, required: true }) : <span className="hidden sm:block" />}
            <fieldset className="grid gap-5 rounded-xl bg-mist p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="sr-only">{t("costsTitle")}</legend>
              <div className="sm:col-span-2">
                <p className="font-semibold">{t("costsTitle")}</p>
                <p className="hint mt-1">{t("costsLead")}</p>
              </div>
              {num("utilitiesCost", t("utilitiesCost"), { min: 0, max: 5000, hint: t("utilitiesCostHint") })}
              {num("internetCost", t("internetCost"), { min: 0, max: 1000 })}
              {num("otherCosts", t("otherCosts"), { min: 0, max: 5000 })}
              <Field name="otherCostsNote" label={t("otherCostsNote")}>
                {(p) => <input {...p} defaultValue={values.otherCostsNote ?? ""} maxLength={200} placeholder={t("otherCostsNotePlaceholder")} className="field" />}
              </Field>
              {num("costSharers", t("costSharers"), { min: 1, max: 30, hint: t("costSharersHint") })}
            </fieldset>
            <Field name="availableFrom" label={t("moveIn")} required>
              {(p) => <input {...p} type="date" defaultValue={values.availableFrom} className="field" />}
            </Field>
            {num("minDurationMonths", lf("minDurationMonths"), { min: 1, max: 36, required: true })}
            <Field name="paymentTerms" label={lf("paymentTerms")} hint={lf("paymentTermsHint")} className="sm:col-span-2">
              {(p) => <input {...p} defaultValue={values.paymentTerms} maxLength={500} className="field" />}
            </Field>
            <Field name="rules" label={t("rules")} hint={t("rulesHint")} className="sm:col-span-2">
              {(p) => <textarea {...p} defaultValue={values.rules} rows={4} maxLength={1000} className="field" />}
            </Field>
            <Field name="videoUrl" label={lf("videoUrl")} hint={lf("videoUrlHint")} className="sm:col-span-2">
              {(p) => <input {...p} type="url" inputMode="url" defaultValue={values.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" className="field" />}
            </Field>
          </div>

          {/* 6 — contact */}
          <div {...panel("contact")} className="space-y-6">
            <div className="flex gap-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink-2">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <p>{isAgent ? t("privacyAgent") : t("privacyLandlord")}</p>
            </div>
            <div className={grid}>
              <Field name="contactName" label={t("contactName")} hint={t("contactNameHint")}>
                {(p) => <input {...p} defaultValue={values.contactName ?? ""} maxLength={80} autoComplete="name" className="field" />}
              </Field>
              <Field name="contactPhone" label={t("contactPhone")} hint={t("contactPhoneHint")}>
                {(p) => <input {...p} type="tel" defaultValue={values.contactPhone ?? ""} autoComplete="tel" className="field" />}
              </Field>
              <Field name="contactPreference" label={t("contactPreference")}>
                {(p) => (
                  <select {...p} value={contactPref} onChange={(ev) => setContactPref(ev.target.value)} className="field">
                    {CONTACT_PREFS.map((k) => (
                      <option key={k} value={k}>
                        {e(`contactPref.${k}`)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="self-end">
                <CheckboxField name="contactWhatsapp" label={t("contactWhatsapp")} defaultChecked={values.contactWhatsapp} />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 mt-10 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:px-0">
            {idx > 0 && (
              <button type="button" className="btn btn-outline" onClick={() => go(STEPS[idx - 1]!)}>
                <ChevronLeft className="size-4" aria-hidden />
                {c("back")}
              </button>
            )}
            <SubmitButton className="btn btn-outline">{isNew ? lf("saveDraft") : lf("saveChanges")}</SubmitButton>
            <button type="button" className="btn btn-primary ml-auto" onClick={next}>
              {isNew && step === "conditions" ? t("createAndContinue") : c("next")}
              <ChevronRight className="size-4" aria-hidden />
            </button>
            {savedMsg && (
              <p role="status" className="basis-full text-sm font-medium text-ok">
                {savedMsg}
              </p>
            )}
          </div>
        </div>
      </ActionForm>

      {/* 5 — photos */}
      {step === "photos" && listingId && (
        <section className="mt-6">
          {savedMsg && justCreated && (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
              <CheckCircle2 className="size-4" aria-hidden /> {savedMsg}
            </p>
          )}
          <PhotoManager listingId={listingId} initial={images} onChange={setPhotoCount} />
          <p className="hint mt-3">{t("photoRules")}</p>
          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-4">
            <button type="button" className="btn btn-outline" onClick={() => go("conditions")}>
              <ChevronLeft className="size-4" aria-hidden />
              {c("back")}
            </button>
            <button type="button" className="btn btn-primary ml-auto" onClick={() => go("contact")}>
              {c("next")}
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {/* 7 — review */}
      {step === "review" && listingId && (
        <section className="mt-6 space-y-8">
          <article className="overflow-hidden rounded-2xl border border-line">
            <div className="relative aspect-[16/9] bg-mist">
              {coverUrl ? (
                <Image src={coverUrl} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-ink-3">
                  <ImageOff className="size-8" aria-hidden />
                </span>
              )}
              <span className="tag absolute top-3 left-3 bg-ink text-white">{d("previewBadge")}</span>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm text-ink-2">
                {cat(category)} · {t(`propertyTypes.${snap.propertyType ?? values.propertyType}` as "propertyTypes.APARTMENT")}
              </p>
              <h3 className="t-h3 mt-1">{snap.title || values.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                <MapPin className="size-4" aria-hidden />
                {[label(snap.metroStationId ?? ""), label(snap.neighborhoodId ?? ""), label(snap.districtId ?? "")].filter(Boolean).join(", ") || "—"}
              </p>
              <p className="t-price mt-3 text-2xl">
                {new Intl.NumberFormat(locale).format(Number(snap.monthlyRent || values.monthlyRent || 0))} ₼ <span className="text-base font-normal text-ink-2">{c("perMonth")}</span>
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  [lf("rooms"), snap.rooms],
                  [lf("areaSqm"), snap.areaSqm],
                  [lf("floor"), snap.floor && snap.totalFloors ? `${snap.floor}/${snap.totalFloors}` : snap.floor],
                  [lf("furnishing"), snap.furnishing ? e(`furnishing.${snap.furnishing}` as "furnishing.FURNISHED") : ""],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-mist px-3 py-2">
                      <dt className="text-ink-2">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
              </dl>
              <p className="mt-4 line-clamp-4 text-[0.9375rem] whitespace-pre-line text-ink-2">{snap.description || values.description}</p>
              <p className="mt-4 text-sm text-ink-2">
                {t("contactPreference")}: <strong className="text-ink">{e(`contactPref.${(snap.contactPreference || values.contactPreference) as "IN_APP"}`)}</strong>
              </p>
            </div>
          </article>

          <div>
            <h3 className="font-semibold">{t("checklist")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                [t("check.title"), (snap.title ?? values.title).length >= 10],
                [t("check.description"), (snap.description ?? values.description).length >= 40],
                [t("check.location"), Boolean(snap.districtId ?? values.districtId)],
                [t("check.price"), Number(snap.monthlyRent ?? values.monthlyRent) >= 30],
                [t("check.photos"), photoCount > 0],
                [t("check.photosGood"), photoCount >= 4],
              ].map(([k, ok], i) => (
                <li key={String(k)} className="flex items-center gap-2">
                  {ok ? <CheckCircle2 className="size-4 text-ok" aria-hidden /> : <AlertCircle className={`size-4 ${i === 5 ? "text-ink-3" : "text-danger"}`} aria-hidden />}
                  <span className={ok ? "" : i === 5 ? "text-ink-2" : "font-medium text-danger"}>{k}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-mist p-5 sm:p-6">
            {canSubmit ? (
              <>
                <h3 className="t-h3">{lf("submitTitle")}</h3>
                <p className="mt-2 text-ink-2">{lf("submitLead", { days: ttlDays })}</p>
                {photoCount === 0 && <p className="mt-2 text-sm font-medium text-warn">{lf("needsPhoto")}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <OpButton
                    action={listingOpAction}
                    id={listingId}
                    op="submit"
                    label={lf("submit")}
                    variant="primary"
                    onDone={(s) => s.status === "ok" && router.push("/dashboard/listings?status=PENDING_REVIEW&submitted=1")}
                  />
                  <Link href="/dashboard/listings?status=DRAFT" className="btn btn-outline btn-sm">
                    {t("keepDraft")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="t-h3">{d(`status.${status as "ACTIVE"}`)}</h3>
                <p className="mt-2 text-ink-2">{status === "ACTIVE" || status === "EXPIRED" ? t("liveEditNote") : t("statusNote")}</p>
              </>
            )}
            <Link href={`/listings/${listingId}`} target="_blank" className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline">
              {t("openPublicPreview")}
            </Link>
          </div>

          {translations && (
            <details className="rounded-2xl border border-line p-5">
              <summary className="cursor-pointer font-semibold">{lf("translationsTitle")}</summary>
              <div className="mt-4">
                <TranslationEditor listingId={listingId} original={values.originalLocale as "az"} translations={translations as never} />
              </div>
            </details>
          )}

          <div className="flex border-t border-line pt-4">
            <button type="button" className="btn btn-outline" onClick={() => go("contact")}>
              <ChevronLeft className="size-4" aria-hidden />
              {c("back")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
