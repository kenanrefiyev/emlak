import { defineRouting } from "next-intl/routing";

export const locales = ["az", "tr", "ru", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "az";

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const LOCALE_COOKIE = "YUVA_LOCALE";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  // An explicit choice (visiting /tr, /ru, /en or using the switcher) is
  // remembered for a year. Browser Accept-Language is ignored on purpose:
  // Azerbaijani is the default for every new visitor (see proxy.ts).
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
});

/** Each language's own name, shown in that language. */
export const localeNames: Record<AppLocale, string> = {
  az: "Azərbaycan dili",
  tr: "Türkçe",
  ru: "Русский",
  en: "English",
};

/**
 * Flag shown beside each language in the selector — a visual cue for the
 * language, not a country choice (English uses the UK flag).
 */
export const localeFlags: Record<AppLocale, string> = {
  az: "az",
  tr: "tr",
  ru: "ru",
  en: "gb",
};

/** BCP 47 tags used for Intl formatting and hreflang. */
export const localeTags: Record<AppLocale, string> = {
  az: "az-AZ",
  tr: "tr-TR",
  ru: "ru-RU",
  en: "en-US",
};

/**
 * Tags for number formatting, which runs on both server and client. Many
 * browsers ship without Azerbaijani number data (Node has it), so the two
 * would print "29,33" and "29.33" and break hydration; Azerbaijani uses the
 * same separators as Turkish ("1.234,5"), so both sides use tr-TR for it.
 */
export const numberTags: Record<AppLocale, string> = { ...localeTags, az: "tr-TR" };
