"use client";

import { toPublicPath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { ListingFilters } from "@/lib/search/listing-filters";
import { FURNISHING, GENDER_PREFS, type ListingCategory } from "@/lib/domain";
import { useSetCountry } from "@/components/site/country-switcher";
import { GroupedOptions } from "@/components/forms/grouped-options";
import { amountScale, currencySymbol } from "@/lib/money";

interface Opt {
  value: string;
  label: string;
  group?: string;
}
interface Props {
  path: string;
  filters: ListingFilters;
  categories: readonly ListingCategory[];
  countries: { code: string; name: string }[];
  /** The market the results are in. */
  country: string;
  /** Currency of the price inputs (sent as `cur`, so results compare across currencies). */
  priceCurrency: string;
  cities: Opt[];
  districts: (Opt & { cityValue: string })[];
  neighborhoods: (Opt & { districtValue: string })[];
  metros: (Opt & { line: string; cityValue: string })[];
  universities: (Opt & { cityValue: string })[];
  showStudentFilters: boolean;
  segment: "students" | "family";
}

/**
 * Filter panel. A plain GET form (works without JS); with JS it drops empty
 * fields from the URL and narrows districts, metro and universities to the
 * chosen city and neighborhoods to the chosen district. Changing the country
 * switches the visitor's market and starts a fresh search there.
 * On small screens it lives in a drawer.
 */
export function FilterForm({
  path,
  filters: f,
  categories,
  countries,
  country,
  priceCurrency,
  cities,
  districts,
  neighborhoods,
  metros,
  universities,
  showStudentFilters,
  segment,
}: Props) {
  const nav = useTranslations("nav");
  const t = useTranslations("search");
  const c = useTranslations("common");
  const cat = useTranslations("categories");
  const e = useTranslations("enums");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const setCountry = useSetCountry();
  const [city, setCity] = useState(f.city ?? "");
  const [district, setDistrict] = useState(f.district ?? "");
  const [open, setOpen] = useState(false);
  const inCity = <T extends { cityValue: string }>(list: T[]) => (city ? list.filter((o) => o.cityValue === city) : list);
  const visibleDistricts = inCity(districts);
  const visibleAreas = district
    ? neighborhoods.filter((n) => n.districtValue === district)
    : neighborhoods.filter((n) => visibleDistricts.some((d) => d.value === n.districtValue));

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const query: Record<string, string> = {};
    const types = fd.getAll("type").map(String);
    if (types.length) query.type = types.join(",");
    for (const [k, v] of fd.entries()) {
      if (k === "type" || typeof v !== "string" || !v.trim()) continue;
      query[k] = v.trim();
    }
    if (f.sort !== "newest") query.sort = f.sort;
    if (f.view !== "grid") query.view = f.view;
    setOpen(false);
    router.push({ pathname: path, query });
  }

  const sel = (name: string, label: string, opts: Opt[], value: string | undefined, onChange?: (v: string) => void) => (
    <div>
      <label htmlFor={`${id}-${name}`} className="label">
        {label}
      </label>
      <select
        id={`${id}-${name}`}
        name={name}
        className="field"
        defaultValue={onChange ? undefined : (value ?? "")}
        value={onChange ? (value ?? "") : undefined}
        onChange={onChange ? (ev) => onChange(ev.target.value) : undefined}
      >
        <option value="">{c("any")}</option>
        <GroupedOptions options={opts} />
      </select>
    </div>
  );

  const form = (
    <form method="get" action={`/${locale}${toPublicPath(path, locale as AppLocale)}`} onSubmit={onSubmit} className="space-y-5" aria-label={t("filters")}>
      <div className="grid grid-cols-2 gap-2.5">
        {(["students", "family"] as const).map((sg) => (
          <Link
            key={sg}
            href={`/${sg}`}
            aria-current={segment === sg ? "page" : undefined}
            className="btn !min-h-12 !px-2 bg-gray text-ink aria-[current=page]:bg-brand aria-[current=page]:text-white"
          >
            {nav(sg)}
          </Link>
        ))}
      </div>
      <div>
        <label htmlFor={`${id}-q`} className="label">
          {t("keyword")}
        </label>
        <input id={`${id}-q`} name="q" type="search" defaultValue={f.q} placeholder={t("keywordPlaceholder")} className="field" maxLength={80} />
      </div>

      <fieldset>
        <legend className="label">{t("type")}</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((k) => (
            <label key={k} className="chip cursor-pointer has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="checkbox" name="type" value={k.toLowerCase()} defaultChecked={f.categories.includes(k)} className="sr-only" />
              {cat(k)}
            </label>
          ))}
        </div>
      </fieldset>

      {countries.length > 1 && (
        <div>
          <label htmlFor={`${id}-country`} className="label">
            {t("country")}
          </label>
          {/* Not submitted with the form: changing it switches the market right away. */}
          <select
            id={`${id}-country`}
            className="field"
            value={country}
            onChange={(ev) => {
              setOpen(false);
              setCountry(ev.target.value, { pathname: path });
            }}
          >
            {countries.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          {f.country && <input type="hidden" name="country" value={f.country} />}
        </div>
      )}
      {sel("city", t("city"), cities, city, (v) => {
        setCity(v);
        setDistrict("");
      })}
      {sel("district", t("district"), visibleDistricts, district, (v) => setDistrict(v))}
      {sel("area", t("neighborhood"), visibleAreas, f.neighborhood)}
      {inCity(metros).length > 0 && sel("metro", t("metro"), inCity(metros), f.metro)}
      {showStudentFilters && inCity(universities).length > 0 && sel("uni", t("university"), inCity(universities), f.university)}

      <fieldset>
        <legend className="label">{t("price", { currency: currencySymbol(priceCurrency) })}</legend>
        <input type="hidden" name="cur" value={priceCurrency} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${id}-min`} className="sr-only">
              {t("priceMin")}
            </label>
            <input id={`${id}-min`} name="min" type="number" inputMode="numeric" min={0} max={20000 * amountScale(priceCurrency)} defaultValue={f.priceMin} placeholder={t("priceMin")} className="field" />
          </div>
          <div>
            <label htmlFor={`${id}-max`} className="sr-only">
              {t("priceMax")}
            </label>
            <input id={`${id}-max`} name="max" type="number" inputMode="numeric" min={0} max={20000 * amountScale(priceCurrency)} defaultValue={f.priceMax} placeholder={t("priceMax")} className="field" />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">{t("rooms")}</legend>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <label key={n} className="chip min-w-11 cursor-pointer justify-center has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="radio" name="rooms" value={n ? String(n) : ""} defaultChecked={(f.rooms ?? 0) === n} className="sr-only" />
              {n === 0 ? t("roomsAny") : n === 4 ? t("rooms4") : n}
            </label>
          ))}
        </div>
      </fieldset>

      {showStudentFilters && (
        <div>
          <label htmlFor={`${id}-spaces`} className="label">
            {t("spaces")}
          </label>
          <input id={`${id}-spaces`} name="spaces" type="number" inputMode="numeric" min={1} max={10} defaultValue={f.spaces} className="field" />
        </div>
      )}

      {sel("furnishing", t("furnishing"), FURNISHING.map((k) => ({ value: k, label: e(`furnishing.${k}`) })), f.furnishing)}
      {showStudentFilters && sel("gender", t("gender"), GENDER_PREFS.filter((g) => g !== "ANY").map((k) => ({ value: k, label: e(`gender.${k}`) })), f.gender)}

      <div>
        <label htmlFor={`${id}-movein`} className="label">
          {t("moveIn")}
        </label>
        <input id={`${id}-movein`} name="movein" type="date" defaultValue={f.moveIn} className="field" aria-describedby={`${id}-movein-h`} />
        <p id={`${id}-movein-h`} className="hint mt-1">
          {t("moveInHint")}
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-duration`} className="label">
          {t("duration")}
        </label>
        <input id={`${id}-duration`} name="duration" type="number" inputMode="numeric" min={1} max={36} defaultValue={f.duration} className="field" aria-describedby={`${id}-dur-h`} />
        <p id={`${id}-dur-h`} className="hint mt-1">
          {t("durationHint")}
        </p>
      </div>

      {sel(
        "posted",
        t("posted"),
        [
          { value: "1", label: t("posted1") },
          { value: "7", label: t("posted7") },
          { value: "30", label: t("posted30") },
        ],
        f.postedWithin ? String(f.postedWithin) : undefined,
      )}

      {sel(
        "utilities",
        t("utilities"),
        [
          { value: "1", label: t("utilitiesIncluded") },
          { value: "0", label: t("utilitiesExcluded") },
        ],
        f.utilities === "included" ? "1" : f.utilities === "excluded" ? "0" : undefined,
      )}

      <div className="space-y-1">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="avail" value="1" defaultChecked={f.available} className="size-5 accent-brand" />
          <span className="text-[0.9375rem]">{t("availableOnly")}</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="verified" value="1" defaultChecked={f.verified} className="size-5 accent-brand" />
          <span className="text-[0.9375rem]">{t("verified")}</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="vowner" value="1" defaultChecked={f.verifiedOwner} className="size-5 accent-brand" />
          <span className="text-[0.9375rem]">{t("verifiedOwner")}</span>
        </label>
      </div>

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-paper px-1 pt-2 pb-1">
        <button type="submit" className="btn btn-primary w-full">
          {c("apply")}
        </button>
        <a href={`/${locale}${toPublicPath(path, locale as AppLocale)}`} className="btn btn-ghost w-full" onClick={(ev) => { ev.preventDefault(); setOpen(false); router.push(path); }}>
          {c("clear")}
        </a>
      </div>
    </form>
  );

  return (
    <>
      <div className="lg:hidden">
        <button type="button" className="btn btn-outline w-full" aria-expanded={open} aria-controls={`${id}-drawer`} onClick={() => setOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("showFilters")}
        </button>
      </div>
      <div
        id={`${id}-drawer`}
        className={`${open ? "fixed inset-0 z-50 flex" : "hidden"} lg:static lg:z-auto lg:block`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? t("filters") : undefined}
      >
        {open && <div className="absolute inset-0 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
        <div className={open ? "relative ml-auto h-full w-[min(24rem,100vw)] overflow-y-auto bg-paper p-5" : "lg:rounded-2xl lg:border lg:border-line lg:p-6"}>
          {open && (
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <h2 className="t-h3">{t("filters")}</h2>
              <button type="button" className="btn btn-ghost !px-2.5" onClick={() => setOpen(false)} aria-label={c("close")}>
                <X className="size-5" aria-hidden />
              </button>
            </div>
          )}
          {form}
        </div>
      </div>
    </>
  );
}
