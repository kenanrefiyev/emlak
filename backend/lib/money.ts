import { numberTags, type AppLocale } from "@/i18n/routing";

/**
 * Money helpers shared by server and client. Amounts are whole units of an
 * ISO 4217 currency. A listing's own amount and currency are the real price;
 * anything converted is an approximate display value and is always marked so.
 */

export const CURRENCY_COOKIE = "YUVA_CURRENCY";

const SYMBOLS: Record<string, string> = { AZN: "₼", TRY: "₺", USD: "$", EUR: "€" };

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency;
}

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

/**
 * Sanity limits on amounts (min rent, max deposit, …) are written in
 * manat-sized units; a currency's scale stretches them to its order of
 * magnitude so an ordinary lira rent is not rejected as absurd. This is not an
 * exchange rate and is never used to convert prices.
 */
const AMOUNT_SCALE: Record<string, number> = { AZN: 1, USD: 1, EUR: 1, TRY: 50 };
export function amountScale(currency: string): number {
  return AMOUNT_SCALE[currency] ?? 1;
}
/** The largest scale of any currency: the outer bound for amounts parsed before their currency is known. */
export const MAX_AMOUNT_SCALE = Math.max(...Object.values(AMOUNT_SCALE));

/** "1 250 ₼", "15.000 ₺": the number in the reader's locale, the sign after it (house style). */
export function formatMoney(amount: number, currency: string, locale: AppLocale): string {
  return `${new Intl.NumberFormat(numberTags[locale], { maximumFractionDigits: 0 }).format(amount)} ${currencySymbol(currency)}`;
}

/** Rates as units per 1 USD, keyed by currency code. */
export type Rates = Record<string, number>;

/** Exact conversion, or null when either rate is unknown. */
export function convert(amount: number, from: string, to: string, rates: Rates | null): number | null {
  if (from === to) return amount;
  const a = rates?.[from];
  const b = rates?.[to];
  if (!a || !b) return null;
  return (amount / a) * b;
}

/** Rounds an approximate price so it does not look more exact than it is. */
export function roundApprox(value: number): number {
  const step = value >= 10_000 ? 100 : value >= 1_000 ? 10 : 1;
  return Math.round(value / step) * step;
}

/** What the visitor wants prices shown in, with the rates to get there. */
export interface MoneyView {
  /** Display currency chosen by the visitor (or their market's default). */
  display: string;
  rates: Rates | null;
  /** When the provider last updated the rates we hold; null if we have none. */
  ratesUpdatedAt: string | null;
}

export interface PriceDisplay {
  /** Formatted price in the display currency, or the original when conversion is impossible. */
  main: string;
  /** True when `main` is a conversion (show "≈" and the original). */
  approximate: boolean;
  /** The listing's own price, formatted in its own currency. */
  original: string;
}

export function displayPrice(amount: number, currency: string, view: MoneyView, locale: AppLocale): PriceDisplay {
  const original = formatMoney(amount, currency, locale);
  if (currency === view.display) return { main: original, approximate: false, original };
  const converted = convert(amount, currency, view.display, view.rates);
  if (converted == null) return { main: original, approximate: false, original };
  return { main: formatMoney(roundApprox(converted), view.display, locale), approximate: true, original };
}

/** One-line form for tight spots (map pins, lists): "≈ 12 400 ₺" or "500 ₼". */
export function displayPriceText(amount: number, currency: string, view: MoneyView, locale: AppLocale): string {
  const d = displayPrice(amount, currency, view, locale);
  return `${d.approximate ? "≈ " : ""}${d.main}`;
}

/** A min–max range with one sign: "200–280 ₼", or "≈ 9 800–13 700 ₺" when converted. */
export function displayRangeText(min: number, max: number, currency: string, view: MoneyView, locale: AppLocale): string {
  const num = new Intl.NumberFormat(numberTags[locale], { maximumFractionDigits: 0 });
  const lo = convert(min, currency, view.display, view.rates);
  const hi = convert(max, currency, view.display, view.rates);
  if (currency === view.display || lo == null || hi == null) return `${num.format(min)}–${formatMoney(max, currency, locale)}`;
  return `≈ ${num.format(roundApprox(lo))}–${formatMoney(roundApprox(hi), view.display, locale)}`;
}

/**
 * Turns a price bound typed in `from` into the same bound for listings priced
 * in `to`. Lower bounds round down and upper bounds round up, so a listing at
 * the edge is never dropped by rounding.
 */
export function convertBound(amount: number, from: string, to: string, rates: Rates | null, edge: "min" | "max"): number | null {
  const v = convert(amount, from, to, rates);
  if (v == null) return null;
  return edge === "min" ? Math.floor(v) : Math.ceil(v);
}
