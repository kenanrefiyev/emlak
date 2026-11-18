"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { COUNTRY_COOKIE, COUNTRY_COOKIE_MAX_AGE, PLACE_PARAMS } from "@/lib/market";
import { CURRENCY_COOKIE } from "@/lib/money";
import type { AppLocale } from "@/i18n/routing";
import { Flag } from "./flag";
import { Picker } from "./picker";

export interface CountryChoice {
  code: string;
  name: string;
}

/**
 * Saves the market and re-renders. Place filters (city, district, metro…) only
 * make sense inside one country, so they are dropped from the current URL;
 * `to` sends the visitor to a fresh page instead. Markets with a language of
 * their own (for now Azerbaijan → az, Türkiye → tr) switch the interface to it;
 * a manually chosen display currency is reset so prices follow the new market.
 */
const MARKET_LOCALE: Record<string, AppLocale> = { az: "az", tr: "tr" };

export function useSetCountry() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = useLocale() as AppLocale;
  return (code: string, to?: { pathname: string }) => {
    const target = MARKET_LOCALE[code];
    const locale = target && target !== current ? target : undefined;
    document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${CURRENCY_COOKIE}=; path=/; max-age=0; samesite=lax`;
    if (to) return router.push(to.pathname, { scroll: false, locale });
    const query = Object.fromEntries([...search.entries()].filter(([k]) => !(PLACE_PARAMS as readonly string[]).includes(k) && k !== "page"));
    if (locale || Object.keys(query).length !== search.size) router.replace({ pathname, query }, { scroll: false, locale });
    else router.refresh();
  };
}

export function CountrySwitcher({ countries, current, variant = "compact" }: { countries: CountryChoice[]; current: string; variant?: "compact" | "list" }) {
  const t = useTranslations("nav");
  const setCountry = useSetCountry();
  const [pending, startTransition] = useTransition();
  const change = (code: string) => startTransition(() => setCountry(code));

  if (variant === "list") {
    return (
      <div role="group" aria-label={t("country")} className="grid grid-cols-2 gap-2">
        {countries.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => change(c.code)}
            aria-pressed={c.code === current}
            disabled={pending}
            className="btn btn-sm justify-start gap-2.5 border-line !px-3 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand"
          >
            <Flag code={c.code} />
            {c.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Picker
      label={t("country")}
      value={current}
      disabled={pending}
      onChange={change}
      options={countries.map((c) => ({ value: c.code, label: c.name, icon: <Flag code={c.code} /> }))}
      trigger={
        <>
          <MapPin className="size-4 text-ink-2" aria-hidden />
          <Flag code={current} />
        </>
      }
    />
  );
}
