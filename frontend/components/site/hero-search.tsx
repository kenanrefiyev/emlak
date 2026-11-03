"use client";

import { toPublicPath } from "@/i18n/paths";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { SEGMENTS } from "@/lib/domain";
import { GroupedOptions } from "@/components/forms/grouped-options";
import { amountScale, currencySymbol } from "@/lib/money";
import { numberTags, type AppLocale } from "@/i18n/routing";

type Tab = "rent" | "roommate" | "family";
interface Opt {
  value: string;
  label: string;
  group?: string;
}
type CityOpt = Opt & { cityValue: string };

/**
 * Hero search in the Homelengo arrangement: tab pills above a wide white pill
 * with labelled fields split by dividers, an outline "advanced" pill and the
 * primary search pill. Each tab is a plain GET form (works before hydration);
 * with JS, empty fields are dropped from the URL.
 */
export function HeroSearch({
  cities,
  districts,
  universities,
  currency,
}: {
  cities: Opt[];
  districts: CityOpt[];
  universities: CityOpt[];
  currency: string;
}) {
  const t = useTranslations("home");
  const cat = useTranslations("categories");
  const c = useTranslations("common");
  const s = useTranslations("search");
  const e = useTranslations("enums");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("rent");
  // A chosen city narrows the district and university lists (the market already narrowed them to one country).
  const [city, setCity] = useState("");
  const inCity = (list: CityOpt[]) => (city ? list.filter((o) => o.cityValue === city) : list);
  const id = useId();
  const path = tab === "rent" ? "/students" : tab === "roommate" ? "/roommates" : "/family";

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const query: Record<string, string> = {};
    for (const [k, v] of new FormData(ev.currentTarget).entries()) if (typeof v === "string" && v.trim()) query[k] = v.trim();
    router.push({ pathname: path, query });
  }

  const segment = (name: string, label: string, control: React.ReactNode, extra = "") => (
    <div className={`min-w-0 flex-1 px-5 py-3 lg:py-0 ${extra}`}>
      {/* One line, so the fields stay aligned when a label is long; the full text is in the tooltip. */}
      <label htmlFor={`${id}-${name}`} title={label} className="block truncate text-sm text-ink-3">
        {label}
      </label>
      {control}
    </div>
  );
  const select = (name: string, opts: Opt[], anyLabel = c("any"), onChange?: (value: string) => void) => (
    <div className="relative mt-0.5">
      <select id={`${id}-${name}`} name={name} defaultValue="" onChange={onChange && ((ev) => onChange(ev.target.value))} className="w-full cursor-pointer appearance-none truncate bg-transparent pr-7 text-[0.9375rem] font-medium text-ink focus:outline-none">
        <option value="">{anyLabel}</option>
        <GroupedOptions options={opts} />
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2" aria-hidden />
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "rent", label: t("tabs.rent") },
    { key: "roommate", label: t("tabs.roommate") },
    { key: "family", label: t("tabs.family") },
  ];

  return (
    <div>
      <div role="tablist" aria-label={t("searchType")} className="flex flex-wrap justify-center gap-2.5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            id={`${id}-tab-${tb.key}`}
            aria-selected={tab === tb.key}
            aria-controls={`${id}-panel`}
            onClick={() => setTab(tb.key)}
            className="min-h-12 rounded-full border border-white px-6 text-base font-semibold text-white transition-colors hover:bg-white/15 aria-selected:border-brand aria-selected:bg-brand sm:px-10"
          >
            {tb.label}
          </button>
        ))}
      </div>

      <form
        key={tab}
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${tab}`}
        method="get"
        action={`/${locale}${toPublicPath(path, locale as AppLocale)}`}
        onSubmit={onSubmit}
        className="mt-5 flex flex-col overflow-hidden rounded-2xl bg-paper text-left lg:flex-row lg:items-center lg:rounded-full lg:py-5 lg:pr-5 lg:pl-5"
      >
        <div className="flex flex-col divide-y divide-line lg:flex-1 lg:flex-row lg:divide-x lg:divide-y-0">
          {tab === "rent" &&
            segment("type", t("searchType"), select("type", SEGMENTS.students.map((k) => ({ value: k.toLowerCase(), label: cat(k) })), c("all")))}
          {tab === "roommate" &&
            segment(
              "type",
              t("searchType"),
              select("type", (["HAS_PLACE", "SEEKING_PARTNER"] as const).map((k) => ({ value: k.toLowerCase(), label: e(`roommateTypeShort.${k}`) })), c("all")),
            )}
          {tab === "family" && segment("rooms", t("searchRooms"), select("rooms", [1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 4 ? s("rooms4") : String(n) }))))}
          {cities.length > 1 && segment("city", t("searchCity"), select("city", cities, c("any"), setCity))}
          {segment("district", t("searchArea"), select("district", inCity(districts)))}
          {tab !== "family" && segment("uni", t("searchUni"), select("uni", inCity(universities)))}
          {segment(
            "budget",
            t("searchBudget", { currency: currencySymbol(currency) }),
            <>
              {/* The budget is in the visitor's display currency; results convert it per listing. */}
              <input type="hidden" name="cur" value={currency} />
              <input
                id={`${id}-budget`}
                name={tab === "roommate" ? "budget" : "max"}
                type="number"
                inputMode="numeric"
                min={0}
                max={20000 * amountScale(currency)}
                placeholder={t("searchBudgetPlaceholder", { amount: new Intl.NumberFormat(numberTags[locale as AppLocale]).format(300 * amountScale(currency)) })}
                className="mt-0.5 w-full bg-transparent text-[0.9375rem] font-medium text-ink placeholder:font-normal placeholder:text-ink-3 focus:outline-none"
              />
            </>,
          )}
        </div>
        <div className="flex gap-2.5 border-t border-line p-4 lg:border-0 lg:p-0 lg:pl-4">
          <Link href={path} className="btn btn-line hidden !px-6 md:inline-flex">
            {s("filters")}
            <SlidersHorizontal className="size-4" aria-hidden />
          </Link>
          <button type="submit" className="btn btn-primary flex-1 !px-8 lg:flex-none">
            {c("search")}
            <Search className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
