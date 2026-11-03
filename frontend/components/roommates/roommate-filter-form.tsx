"use client";

import { toPublicPath } from "@/i18n/paths";
import type { AppLocale } from "@/i18n/routing";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { RoommateFilters } from "@/lib/search/roommate-filters";
import { GENDER_PREFS, SMOKING } from "@/lib/domain";
import { useSetCountry } from "@/components/site/country-switcher";
import { GroupedOptions } from "@/components/forms/grouped-options";
import { amountScale, currencySymbol } from "@/lib/money";

interface Opt {
  value: string;
  label: string;
  group?: string;
}

interface Props {
  filters: RoommateFilters;
  countries: { code: string; name: string }[];
  /** The market the results are in. */
  country: string;
  /** Currency the budget is typed in (sent as `cur`, so ads in other currencies compare correctly). */
  budgetCurrency: string;
  cities: Opt[];
  districts: (Opt & { cityValue: string })[];
  universities: (Opt & { cityValue: string })[];
}

export function RoommateFilterForm({ filters: f, countries, country, budgetCurrency, cities, districts, universities }: Props) {
  const t = useTranslations("roommates");
  const s = useTranslations("search");
  const c = useTranslations("common");
  const e = useTranslations("enums");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const setCountry = useSetCountry();
  const [city, setCity] = useState(f.city ?? "");
  const inCity = <T extends { cityValue: string }>(list: T[]) => (city ? list.filter((o) => o.cityValue === city) : list);

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const query: Record<string, string> = {};
    for (const [k, v] of new FormData(ev.currentTarget).entries()) if (typeof v === "string" && v.trim()) query[k] = v.trim();
    if (f.sort !== "newest") query.sort = f.sort;
    router.push({ pathname: "/roommates", query });
  }

  const sel = (name: string, label: string, opts: Opt[], value?: string) => (
    <div>
      <label htmlFor={`${id}-${name}`} className="label">
        {label}
      </label>
      <select id={`${id}-${name}`} name={name} defaultValue={value ?? ""} className="field">
        <option value="">{c("any")}</option>
        <GroupedOptions options={opts} />
      </select>
    </div>
  );

  return (
    <form method="get" action={`/${locale}${toPublicPath("/roommates", locale as AppLocale)}`} onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6" aria-label={s("filters")}>
      {sel(
        "type",
        t("filterType"),
        (["HAS_PLACE", "SEEKING_PARTNER"] as const).map((k) => ({ value: k.toLowerCase(), label: e(`roommateType.${k}`) })),
        f.type?.toLowerCase(),
      )}
      {countries.length > 1 && (
        <div>
          <label htmlFor={`${id}-country`} className="label">
            {s("country")}
          </label>
          {/* Not submitted with the form: changing it switches the market right away. */}
          <select id={`${id}-country`} className="field" value={country} onChange={(ev) => setCountry(ev.target.value, { pathname: "/roommates" })}>
            {countries.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          {f.country && <input type="hidden" name="country" value={f.country} />}
        </div>
      )}
      <div>
        <label htmlFor={`${id}-city`} className="label">
          {s("city")}
        </label>
        <select id={`${id}-city`} name="city" value={city} onChange={(ev) => setCity(ev.target.value)} className="field">
          <option value="">{c("any")}</option>
          {cities.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {/* Keyed by city so a stale district or university resets when the city changes. */}
      <div key={`d-${city}`}>{sel("district", s("district"), inCity(districts), f.district)}</div>
      {inCity(universities).length > 0 && <div key={`u-${city}`}>{sel("uni", s("university"), inCity(universities), f.university)}</div>}
      <div>
        <label htmlFor={`${id}-budget`} className="label">
          {t("filterBudget", { currency: currencySymbol(budgetCurrency) })}
        </label>
        <input type="hidden" name="cur" value={budgetCurrency} />
        <input id={`${id}-budget`} name="budget" type="number" inputMode="numeric" min={0} max={20000 * amountScale(budgetCurrency)} defaultValue={f.budget} className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-movein`} className="label">
          {t("filterMoveIn")}
        </label>
        <input id={`${id}-movein`} name="movein" type="date" defaultValue={f.moveIn} className="field" />
      </div>
      {sel("gender", s("gender"), GENDER_PREFS.filter((g) => g !== "ANY").map((k) => ({ value: k, label: e(`gender.${k}`) })), f.gender)}
      {sel("smoking", t("filterSmoking"), SMOKING.map((k) => ({ value: k, label: e(`smoking.${k}`) })), f.smoking)}
      <div className="flex items-end gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          {c("apply")}
        </button>
        <a
          href={`/${locale}${toPublicPath("/roommates", locale as AppLocale)}`}
          onClick={(ev) => {
            ev.preventDefault();
            router.push("/roommates");
          }}
          className="btn btn-outline"
        >
          {c("clear")}
        </a>
      </div>
    </form>
  );
}
