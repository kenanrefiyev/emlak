import type { Metadata } from "next";
import { localeTags, locales, type AppLocale } from "@/i18n/routing";
import { HERO_PHOTO } from "@/lib/area-photos";
import { toPublicPath } from "@/i18n/paths";

/** Shared when a page has no image of its own: the homepage hero photo. */
const DEFAULT_SHARE_IMAGE = HERO_PHOTO.src;

export function siteUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Absolute public URL of a route path in one language, e.g. ("/students", "az") → …/az/evler. */
export function localeUrl(locale: AppLocale, path: string) {
  return `${siteUrl()}/${locale}${path === "/" ? "" : toPublicPath(path, locale)}`;
}

/**
 * Canonical + hreflang alternates for a route that exists in every locale.
 * `path` is the locale-less route path, e.g. "/students" or "/listings/abc";
 * each language gets its own localized URL.
 */
export function alternatesFor(locale: AppLocale, path: string, available: readonly AppLocale[] = locales) {
  const languages: Record<string, string> = {};
  for (const l of available) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl("az", path);
  return { canonical: localeUrl(locale, path), languages };
}

/**
 * Open Graph for a page in one language. Next.js replaces (not merges) the
 * layout's openGraph when a page sets its own, so every page goes through this
 * to keep the site name, the og:locale (az_AZ) and the other languages.
 */
export function openGraphFor(
  locale: AppLocale,
  fields: { title?: string; description?: string; type?: "website" | "article"; images?: string[] } = {},
): Metadata["openGraph"] {
  const og = (l: AppLocale) => localeTags[l].replace("-", "_");
  return {
    siteName: "Yuva",
    type: "website",
    images: [DEFAULT_SHARE_IMAGE],
    ...fields,
    locale: og(locale),
    alternateLocale: locales.filter((l) => l !== locale).map(og),
  };
}
