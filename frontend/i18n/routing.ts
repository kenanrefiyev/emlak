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

export const localeNames: Record<AppLocale, string> = {
  az: "Azərbaycanca",
  tr: "Türkçe",
  ru: "Русский",
  en: "English",
};

/** BCP 47 tags used for Intl formatting and hreflang. */
export const localeTags: Record<AppLocale, string> = {
  az: "az-AZ",
  tr: "tr-TR",
  ru: "ru-RU",
  en: "en-US",
};
