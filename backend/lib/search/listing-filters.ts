import {
  FURNISHING,
  GENDER_PREFS,
  LISTING_CATEGORIES,
  LISTING_SORTS,
  PRICE_MAX,
  SEGMENTS,
  type ListingCategory,
  type ListingSort,
  type Segment,
} from "@/lib/domain";
import { isCountryCode } from "@/lib/market";
import { isCurrencyCode, MAX_AMOUNT_SCALE } from "@/lib/money";

/**
 * Listing search state lives in the URL so searches can be bookmarked and
 * shared. Parsing is forgiving: unknown or malformed values are dropped, never
 * thrown, and everything is clamped to sane ranges.
 */
export interface ListingFilters {
  q?: string;
  categories: ListingCategory[];
  /** Market (country code). Absent in the URL = the visitor's selected market. */
  country?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  metro?: string;
  university?: string;
  priceMin?: number;
  priceMax?: number;
  /** Currency the price range was typed in (the visitor's display currency). */
  priceCurrency?: string;
  /** 1..3 exact, 4 = four or more */
  rooms?: number;
  spaces?: number;
  furnishing?: (typeof FURNISHING)[number];
  /** Utilities included in the rent, or paid separately. */
  utilities?: "included" | "excluded";
  /** Only listings the owner reports as available (not reserved / paused). */
  available?: boolean;
  /** Only listings whose landlord or agent passed identity review. */
  verifiedOwner?: boolean;
  moveIn?: string;
  duration?: number;
  verified?: boolean;
  postedWithin?: 1 | 7 | 30;
  gender?: (typeof GENDER_PREFS)[number];
  sort: ListingSort;
  page: number;
  view: "grid" | "list" | "map";
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function getter(params: Params) {
  return (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
}

const SLUG = /^[a-z0-9-]{1,60}$/;
const slug = (v?: string) => (v && SLUG.test(v) ? v : undefined);
const int = (v: string | undefined, min: number, max: number) => {
  if (!v || !/^\d{1,7}$/.test(v)) return undefined;
  const n = Number(v);
  return n >= min && n <= max ? n : undefined;
};
const oneOf = <T extends string>(v: string | undefined, values: readonly T[]) =>
  v && (values as readonly string[]).includes(v) ? (v as T) : undefined;

export function parseListingFilters(params: Params, segment?: Segment): ListingFilters {
  const get = getter(params);
  const allowed: readonly ListingCategory[] = segment ? SEGMENTS[segment] : LISTING_CATEGORIES;
  const categories = (get("type") ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is ListingCategory => (allowed as readonly string[]).includes(c));

  // Bounds may be typed in any market's currency, so allow the largest currency's range.
  let priceMin = int(get("min"), 0, PRICE_MAX * MAX_AMOUNT_SCALE);
  let priceMax = int(get("max"), 0, PRICE_MAX * MAX_AMOUNT_SCALE);
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];

  const moveIn = get("movein");
  const posted = int(get("posted"), 1, 30);
  const q = get("q")?.trim().slice(0, 80);

  return {
    q: q || undefined,
    categories: [...new Set(categories)],
    country: isCountryCode(get("country")) ? get("country") : undefined,
    city: slug(get("city")),
    district: slug(get("district")),
    neighborhood: slug(get("area")),
    metro: slug(get("metro")),
    university: slug(get("uni")),
    priceMin,
    priceMax,
    priceCurrency: isCurrencyCode(get("cur")) ? get("cur") : undefined,
    rooms: int(get("rooms"), 1, 4),
    spaces: int(get("spaces"), 1, 10),
    furnishing: oneOf(get("furnishing"), FURNISHING),
    utilities: get("utilities") === "1" ? "included" : get("utilities") === "0" ? "excluded" : undefined,
    available: get("avail") === "1" || undefined,
    verifiedOwner: get("vowner") === "1" || undefined,
    moveIn: moveIn && /^\d{4}-\d{2}-\d{2}$/.test(moveIn) && !Number.isNaN(Date.parse(moveIn)) ? moveIn : undefined,
    duration: int(get("duration"), 1, 36),
    verified: get("verified") === "1" || undefined,
    postedWithin: posted === 1 || posted === 7 || posted === 30 ? posted : undefined,
    gender: oneOf(get("gender"), GENDER_PREFS),
    sort: oneOf(get("sort"), LISTING_SORTS) ?? "newest",
    page: int(get("page"), 1, 500) ?? 1,
    view: get("view") === "list" ? "list" : get("view") === "map" ? "map" : "grid",
  };
}

/** Serializes filters back to a canonical query string (defaults omitted). */
export function listingFiltersToQuery(f: Partial<ListingFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categories?.length) p.set("type", f.categories.map((c) => c.toLowerCase()).join(","));
  if (f.country) p.set("country", f.country);
  if (f.city) p.set("city", f.city);
  if (f.district) p.set("district", f.district);
  if (f.neighborhood) p.set("area", f.neighborhood);
  if (f.metro) p.set("metro", f.metro);
  if (f.university) p.set("uni", f.university);
  if (f.priceMin !== undefined) p.set("min", String(f.priceMin));
  if (f.priceMax !== undefined) p.set("max", String(f.priceMax));
  if (f.priceCurrency && (f.priceMin !== undefined || f.priceMax !== undefined)) p.set("cur", f.priceCurrency);
  if (f.rooms) p.set("rooms", String(f.rooms));
  if (f.spaces) p.set("spaces", String(f.spaces));
  if (f.furnishing) p.set("furnishing", f.furnishing);
  if (f.utilities) p.set("utilities", f.utilities === "included" ? "1" : "0");
  if (f.available) p.set("avail", "1");
  if (f.verifiedOwner) p.set("vowner", "1");
  if (f.moveIn) p.set("movein", f.moveIn);
  if (f.duration) p.set("duration", String(f.duration));
  if (f.verified) p.set("verified", "1");
  if (f.postedWithin) p.set("posted", String(f.postedWithin));
  if (f.gender && f.gender !== "ANY") p.set("gender", f.gender);
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  if (f.view && f.view !== "grid") p.set("view", f.view);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

/** Keys that count as "active filters" (shown as chips and in the count). */
export const LISTING_FILTER_KEYS = [
  "q",
  "categories",
  "city",
  "district",
  "neighborhood",
  "metro",
  "university",
  "priceMin",
  "priceMax",
  "rooms",
  "spaces",
  "furnishing",
  "utilities",
  "available",
  "verifiedOwner",
  "moveIn",
  "duration",
  "verified",
  "postedWithin",
  "gender",
] as const satisfies readonly (keyof ListingFilters)[];

export type ListingFilterKey = (typeof LISTING_FILTER_KEYS)[number];

export function activeListingFilters(f: ListingFilters): ListingFilterKey[] {
  return LISTING_FILTER_KEYS.filter((k) => {
    const v = f[k];
    if (Array.isArray(v)) return v.length > 0;
    if (k === "gender") return v !== undefined && v !== "ANY";
    return v !== undefined && v !== false;
  });
}

/** Removes one filter and resets pagination. */
export function withoutFilter(f: ListingFilters, key: ListingFilterKey): ListingFilters {
  const next: ListingFilters = { ...f, page: 1 };
  if (key === "categories") next.categories = [];
  else delete (next as Partial<ListingFilters>)[key];
  if (key === "city") {
    delete next.district;
    delete next.neighborhood;
    delete next.metro;
    delete next.university;
  }
  if (key === "district") delete next.neighborhood;
  return next;
}
