import { createElement, type ComponentProps } from "react";
import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { routing, type AppLocale } from "./routing";
import { toPublicPath, toRoutePath } from "./paths";

const nav = createNavigation(routing);

type Href = ComponentProps<typeof nav.Link>["href"];

/** Rewrites a route href ("/students?…" or { pathname: "/students" }) to its public, localized path. */
function localize(href: Href, locale: AppLocale): Href {
  if (typeof href === "string") return href.startsWith("/") ? toPublicPath(href, locale) : href;
  return href.pathname ? { ...href, pathname: toPublicPath(href.pathname, locale) } : href;
}

/**
 * The app links to route paths ("/students", "/roommates/new"); these wrappers
 * turn them into the localized public URLs (see i18n/paths) so pages never
 * link through a redirect, and turn the current URL back into a route path.
 */
export function Link({ href, locale, ...rest }: ComponentProps<typeof nav.Link>) {
  const current = useLocale() as AppLocale;
  return createElement(nav.Link, { ...rest, locale, href: localize(href, (locale as AppLocale | undefined) ?? current) });
}

export function useRouter() {
  const router = nav.useRouter();
  const current = useLocale() as AppLocale;
  type Opts = Parameters<typeof router.push>[1];
  const to = (href: Href, opts?: Opts) => localize(href, ((opts as { locale?: AppLocale } | undefined)?.locale ?? current) as AppLocale);
  return {
    ...router,
    push: (href: Href, opts?: Opts) => router.push(to(href, opts) as Parameters<typeof router.push>[0], opts),
    replace: (href: Href, opts?: Opts) => router.replace(to(href, opts) as Parameters<typeof router.replace>[0], opts),
    prefetch: (href: Href, opts?: Parameters<typeof router.prefetch>[1]) => router.prefetch(to(href) as Parameters<typeof router.prefetch>[0], opts),
  };
}

/** The current route path (locale-less), whatever localized URL the visitor is on. */
export function usePathname() {
  return toRoutePath(nav.usePathname(), useLocale() as AppLocale);
}

export const { redirect, getPathname } = nav;
