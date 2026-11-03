import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCountries, getCurrentCountry } from "@/server/countries";
import { getRates } from "@/server/exchange-rates";
import { CURRENCY_COOKIE, type MoneyView } from "@/lib/money";

/** Currencies a visitor can display prices in: those of the active markets. */
export async function displayCurrencies(): Promise<string[]> {
  return [...new Set((await getCountries()).map((c) => c.currency))];
}

/**
 * The visitor's display currency and the rates to convert into it. A manual
 * choice (cookie) wins; otherwise the selected market's currency is used.
 * Changing the market clears the manual choice (see CountrySwitcher).
 */
export const getMoneyView = cache(async (): Promise<MoneyView> => {
  const [market, supported, snapshot, jar] = await Promise.all([getCurrentCountry(), displayCurrencies(), getRates(), cookies()]);
  const chosen = jar.get(CURRENCY_COOKIE)?.value;
  return {
    display: chosen && supported.includes(chosen) ? chosen : market.currency,
    rates: snapshot?.rates ?? null,
    ratesUpdatedAt: snapshot?.updatedAt.toISOString() ?? null,
  };
});
