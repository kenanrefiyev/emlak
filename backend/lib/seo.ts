import { locales, type AppLocale } from "@/i18n/routing";

export function siteUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Canonical + hreflang alternates for a public path that exists in every
 * locale. `path` is locale-less, e.g. "/students" or "/listings/abc".
 */
export function alternatesFor(locale: AppLocale, path: string, available: readonly AppLocale[] = locales) {
  const clean = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of available) languages[l] = `${siteUrl()}/${l}${clean}`;
  languages["x-default"] = `${siteUrl()}/az${clean}`;
  return { canonical: `${siteUrl()}/${locale}${clean}`, languages };
}
