import { GENDER_PREFS, PRICE_MAX, ROOMMATE_TYPES, SMOKING, type RoommateType } from "@/lib/domain";
import { isCountryCode } from "@/lib/market";
import { isCurrencyCode, MAX_AMOUNT_SCALE } from "@/lib/money";

export interface RoommateFilters {
  type?: RoommateType;
  /** Market (country code). Absent in the URL = the visitor's selected market. */
  country?: string;
  city?: string;
  district?: string;
  university?: string;
  /** "What I can pay per month" — matches contributions ≤ budget and ranges that include it. */
  budget?: number;
  /** Currency the budget was typed in (the visitor's display currency). */
  budgetCurrency?: string;
  moveIn?: string;
  gender?: (typeof GENDER_PREFS)[number];
  smoking?: (typeof SMOKING)[number];
  sort: "newest" | "price_asc" | "match";
  page: number;
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

export function parseRoommateFilters(params: Params): RoommateFilters {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const slug = (v?: string) => (v && /^[a-z0-9-]{1,60}$/.test(v) ? v : undefined);
  const budgetRaw = get("budget");
  const budget = budgetRaw && /^\d{1,7}$/.test(budgetRaw) ? Math.min(Number(budgetRaw), PRICE_MAX * MAX_AMOUNT_SCALE) : undefined;
  const typeRaw = get("type")?.toUpperCase();
  const moveIn = get("movein");
  const page = Number(get("page"));
  const sort = get("sort");
  const gender = get("gender");
  const smoking = get("smoking");
  return {
    type: (ROOMMATE_TYPES as readonly string[]).includes(typeRaw ?? "") ? (typeRaw as RoommateType) : undefined,
    country: isCountryCode(get("country")) ? get("country") : undefined,
    city: slug(get("city")),
    district: slug(get("district")),
    university: slug(get("uni")),
    budget: budget && budget > 0 ? budget : undefined,
    budgetCurrency: isCurrencyCode(get("cur")) ? get("cur") : undefined,
    moveIn: moveIn && /^\d{4}-\d{2}-\d{2}$/.test(moveIn) && !Number.isNaN(Date.parse(moveIn)) ? moveIn : undefined,
    gender: (GENDER_PREFS as readonly string[]).includes(gender ?? "") ? (gender as RoommateFilters["gender"]) : undefined,
    smoking: (SMOKING as readonly string[]).includes(smoking ?? "") ? (smoking as RoommateFilters["smoking"]) : undefined,
    sort: sort === "price_asc" || sort === "match" ? sort : "newest",
    page: Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1,
  };
}

export function roommateFiltersToQuery(f: Partial<RoommateFilters>): string {
  const p = new URLSearchParams();
  if (f.type) p.set("type", f.type.toLowerCase());
  if (f.country) p.set("country", f.country);
  if (f.city) p.set("city", f.city);
  if (f.district) p.set("district", f.district);
  if (f.university) p.set("uni", f.university);
  if (f.budget) p.set("budget", String(f.budget));
  if (f.budget && f.budgetCurrency) p.set("cur", f.budgetCurrency);
  if (f.moveIn) p.set("movein", f.moveIn);
  if (f.gender && f.gender !== "ANY") p.set("gender", f.gender);
  if (f.smoking) p.set("smoking", f.smoking);
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p.toString();
}
