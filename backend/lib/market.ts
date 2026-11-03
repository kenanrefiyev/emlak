/**
 * The visitor's market (country) is independent of the interface language:
 * someone can browse Türkiye in Azerbaijani. The choice lives in a cookie;
 * search URLs may also carry ?country= so shared links open the same market.
 */
export const COUNTRY_COOKIE = "YUVA_COUNTRY";
export const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Country codes are lowercase ISO 3166-1 alpha-2. */
export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z]{2}$/.test(value);
}

/** URL query keys that point at a place inside one market; dropped when the market changes. */
export const PLACE_PARAMS = ["country", "city", "district", "area", "metro", "uni"] as const;
