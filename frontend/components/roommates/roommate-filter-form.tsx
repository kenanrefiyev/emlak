"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { RoommateFilters } from "@/lib/search/roommate-filters";
import { GENDER_PREFS, SMOKING } from "@/lib/domain";

interface Opt {
  value: string;
  label: string;
}

export function RoommateFilterForm({ filters: f, districts, universities }: { filters: RoommateFilters; districts: Opt[]; universities: Opt[] }) {
  const t = useTranslations("roommates");
  const s = useTranslations("search");
  const c = useTranslations("common");
  const e = useTranslations("enums");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();

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
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form method="get" action={`/${locale}/roommates`} onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6" aria-label={s("filters")}>
      {sel(
        "type",
        t("filterType"),
        (["HAS_PLACE", "SEEKING_PARTNER"] as const).map((k) => ({ value: k.toLowerCase(), label: e(`roommateType.${k}`) })),
        f.type?.toLowerCase(),
      )}
      {sel("district", s("district"), districts, f.district)}
      {sel("uni", s("university"), universities, f.university)}
      <div>
        <label htmlFor={`${id}-budget`} className="label">
          {t("filterBudget")}
        </label>
        <input id={`${id}-budget`} name="budget" type="number" inputMode="numeric" min={0} max={20000} defaultValue={f.budget} className="field" />
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
          href={`/${locale}/roommates`}
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
