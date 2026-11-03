import type { AppLocale } from "./routing";

/**
 * Localized public URLs. Routes live under English folder names (app/[locale]/
 * students, …); visitors and search engines see the first path segment in the
 * page's language (/az/evler, /tr/ev-arkadasi, /en/housing). The proxy
 * rewrites public paths to the routes and permanently redirects the old route
 * paths, so existing links and bookmarks keep working. Only the first segment
 * is translated; everything after it (ids, city slugs) is shared.
 */
export const LOCALIZED_SEGMENTS: Record<string, Record<AppLocale, string>> = {
  students: { az: "evler", tr: "evler", en: "housing", ru: "housing" },
  roommates: { az: "ev-yoldasi", tr: "ev-arkadasi", en: "roommates", ru: "roommates" },
  cities: { az: "seherler", tr: "sehirler", en: "cities", ru: "goroda" },
};

function splitPath(path: string): [string, string] {
  const i = path.search(/[?#]/);
  return i === -1 ? [path, ""] : [path.slice(0, i), path.slice(i)];
}

function mapFirstSegment(path: string, map: (segment: string) => string | undefined): string {
  const [pathname, rest] = splitPath(path);
  const m = /^\/([^/]+)(.*)$/.exec(pathname);
  if (!m) return path;
  const next = map(m[1]!);
  return next === undefined ? path : `/${next}${m[2]}${rest}`;
}

/** Route path → public path, e.g. "/students?district=x" → "/evler?district=x" (az). Locale-less in and out. */
export function toPublicPath(path: string, locale: AppLocale): string {
  return mapFirstSegment(path, (s) => LOCALIZED_SEGMENTS[s]?.[locale]);
}

/** Public path → route path, the inverse of toPublicPath. Unknown segments pass through. */
export function toRoutePath(path: string, locale: AppLocale): string {
  return mapFirstSegment(path, (s) => Object.entries(LOCALIZED_SEGMENTS).find(([, byLocale]) => byLocale[locale] === s)?.[0]);
}

/** For the proxy: a public segment to rewrite to its route, or an old route segment to redirect from. */
export function resolveSegment(segment: string, locale: AppLocale): { rewriteTo: string } | { redirectTo: string } | null {
  const route = Object.entries(LOCALIZED_SEGMENTS).find(([, byLocale]) => byLocale[locale] === segment)?.[0];
  if (route && route !== segment) return { rewriteTo: route };
  const localized = LOCALIZED_SEGMENTS[segment]?.[locale];
  if (localized && localized !== segment) return { redirectTo: localized };
  return null;
}
