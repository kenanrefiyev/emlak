import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { db } from "@/server/db";
import { getCountries } from "@/server/countries";
import type { Rates } from "@/lib/money";

/**
 * Exchange rates for display conversions, from ExchangeRate-API's free open
 * endpoint (no key; daily updates; attribution required — see RATES_SOURCE).
 * The latest rates live in the exchange_rates table so every server instance
 * shares them; a short in-memory copy saves a query per request. When rates
 * are older than REFRESH_AFTER they are refreshed after the response is sent
 * (the visitor never waits); a failed fetch keeps the last good rates and is
 * retried no sooner than RETRY_AFTER. With no rates at all, prices are simply
 * shown in their original currency.
 */
export const RATES_SOURCE = { name: "ExchangeRate-API", url: "https://www.exchangerate-api.com" };
const ENDPOINT = process.env.EXCHANGE_RATES_URL || "https://open.er-api.com/v6/latest/USD";
const REFRESH_AFTER = 6 * 3_600_000;
const RETRY_AFTER = 15 * 60_000;
const MEMORY_TTL = 5 * 60_000;
const TIMEOUT = 5_000;

export interface RateSnapshot {
  rates: Rates;
  /** When the provider published these rates. */
  updatedAt: Date;
  /** When we last fetched them successfully. */
  fetchedAt: Date;
}

let memory: { at: number; snapshot: RateSnapshot | null } | null = null;
let lastFailure = 0;
let inFlight: Promise<RateSnapshot | null> | null = null;

/** Currencies the site needs: every active market's currency, plus USD (the base). */
async function neededCurrencies() {
  return [...new Set(["USD", ...(await getCountries()).map((c) => c.currency)])];
}

async function readStored(): Promise<RateSnapshot | null> {
  const rows = await db.exchangeRate.findMany();
  if (!rows.length) return null;
  return {
    rates: Object.fromEntries(rows.map((r) => [r.currency, r.perUsd])),
    updatedAt: new Date(Math.min(...rows.map((r) => r.providerUpdatedAt.getTime()))),
    fetchedAt: new Date(Math.min(...rows.map((r) => r.fetchedAt.getTime()))),
  };
}

/** Fetches fresh rates and stores them. Throws on any network or format problem. */
export async function refreshRates(fetchImpl: typeof fetch = fetch): Promise<RateSnapshot> {
  const res = await fetchImpl(ENDPOINT, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  if (!res.ok) throw new Error(`exchange rates: HTTP ${res.status}`);
  const body = (await res.json()) as { result?: string; base_code?: string; time_last_update_unix?: number; rates?: Record<string, unknown> };
  if (body.result !== "success" || body.base_code !== "USD" || !body.rates || typeof body.time_last_update_unix !== "number")
    throw new Error("exchange rates: unexpected response");
  const updatedAt = new Date(body.time_last_update_unix * 1000);
  const fetchedAt = new Date();
  const rates: Rates = {};
  for (const code of await neededCurrencies()) {
    const v = body.rates[code];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) throw new Error(`exchange rates: no valid rate for ${code}`);
    rates[code] = v;
  }
  await db.$transaction(
    Object.entries(rates).map(([currency, perUsd]) =>
      db.exchangeRate.upsert({
        where: { currency },
        create: { currency, perUsd, providerUpdatedAt: updatedAt, fetchedAt },
        update: { perUsd, providerUpdatedAt: updatedAt, fetchedAt },
      }),
    ),
  );
  const snapshot = { rates, updatedAt, fetchedAt };
  memory = { at: Date.now(), snapshot };
  return snapshot;
}

/** One refresh at a time per instance; failures are logged and backed off, never thrown. */
function refreshQuietly(): Promise<RateSnapshot | null> {
  if (Date.now() - lastFailure < RETRY_AFTER) return Promise.resolve(null);
  inFlight ??= refreshRates()
    .catch((err) => {
      lastFailure = Date.now();
      console.error("[exchange-rates] refresh failed; keeping last good rates", err instanceof Error ? err.message : err);
      return null;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** The current rates (possibly a little stale), or null when none have ever been fetched. */
export const getRates = cache(async (): Promise<RateSnapshot | null> => {
  if (memory && Date.now() - memory.at < MEMORY_TTL && memory.snapshot) return memory.snapshot;
  const stored = await readStored();
  const needed = await neededCurrencies();
  const complete = stored && needed.every((c) => stored.rates[c]);
  if (!complete) {
    // Nothing usable yet (first run, or a new market's currency): fetch now.
    return (await refreshQuietly()) ?? stored;
  }
  memory = { at: Date.now(), snapshot: stored };
  if (Date.now() - stored.fetchedAt.getTime() > REFRESH_AFTER) {
    try {
      after(() => refreshQuietly());
    } catch {
      // Outside a request (scripts, tests): refresh inline instead.
      await refreshQuietly();
    }
  }
  return stored;
});

/** Test hook: forget the in-memory copy and backoff state. */
export function resetRateMemory() {
  memory = null;
  lastFailure = 0;
}
