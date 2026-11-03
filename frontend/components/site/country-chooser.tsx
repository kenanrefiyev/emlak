"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSetCountry } from "./country-switcher";
import { Flag } from "./flag";

export interface MarketCard {
  code: string;
  name: string;
  cities: number;
  listings: number;
  roommates: number;
}

/**
 * Homepage "Choose your country": one card per market. Choosing a card sets
 * the visitor's market (as the header selector does) and the page re-renders
 * for it; the current market's card links straight into its listings.
 */
export function CountryChooser({ markets, current }: { markets: MarketCard[]; current: string }) {
  const t = useTranslations("home");
  const setCountry = useSetCountry();
  const [pending, startTransition] = useTransition();

  return (
    <ul className="grid gap-[30px] sm:grid-cols-2">
      {markets.map((m) => {
        const selected = m.code === current;
        const body = (
          <>
            <span className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <Flag code={m.code} className="!h-6 !w-9 !rounded-md" />
                <span className="text-2xl font-semibold">{m.name}</span>
              </span>
              {selected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  <Check className="size-3.5" aria-hidden />
                  {t("countrySelected")}
                </span>
              )}
            </span>
            <span className="mt-4 block text-[0.9375rem] text-ink-2">{t("countryStats", { cities: m.cities, listings: m.listings, roommates: m.roommates })}</span>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-brand">
              {selected ? t("countryBrowse", { country: m.name }) : t("countrySwitch", { country: m.name })}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </>
        );
        const card = `group block h-full rounded-2xl border p-6 text-left transition-colors sm:p-8 ${selected ? "border-brand bg-brand-soft" : "border-line hover:border-ink"}`;
        return (
          <li key={m.code}>
            {selected ? (
              <Link href="/students" className={card}>
                {body}
              </Link>
            ) : (
              <button type="button" disabled={pending} onClick={() => startTransition(() => setCountry(m.code))} className={`${card} w-full disabled:opacity-60`}>
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
