import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { isLocale, routing } from "@/i18n/routing";
import { resolveSegment } from "@/i18n/paths";

const intl = createMiddleware(routing);

/**
 * Public routes are always locale-prefixed (/az, /tr, /ru, /en). A new visitor
 * lands on Azerbaijani: Accept-Language is stripped before next-intl sees the
 * request, so only the URL prefix or the remembered locale cookie decide.
 * /emlk-xyz (the hidden admin panel), /api and /uploads are excluded by the matcher (admin is az-only).
 *
 * Localized first segments (see i18n/paths): /az/evler is served by the
 * /students route, and the old /az/students permanently redirects to it.
 */
export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const [, locale, segment] = url.pathname.split("/");
  const resolved = isLocale(locale) && segment ? resolveSegment(segment, locale) : null;

  if (resolved && "redirectTo" in resolved) {
    const target = url.clone();
    target.pathname = url.pathname.replace(`/${locale}/${segment}`, `/${locale}/${resolved.redirectTo}`);
    return NextResponse.redirect(target, 308);
  }

  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  const routeUrl = url.clone();
  if (resolved) routeUrl.pathname = url.pathname.replace(`/${locale}/${segment}`, `/${locale}/${resolved.rewriteTo}`);
  const response = intl(new NextRequest(routeUrl, { headers, method: request.method }));
  if (!resolved || response.headers.has("location")) return response;

  // Serve the route while the visitor keeps the localized URL; keep next-intl's cookies and headers.
  const rewrite = NextResponse.rewrite(routeUrl, { headers: response.headers });
  for (const cookie of response.cookies.getAll()) rewrite.cookies.set(cookie);
  return rewrite;
}

export const config = {
  // `\\.` in the source is a literal dot in the pattern: files like /favicon.ico skip the proxy.
  // (A single `\.` collapses to "any character" and silently excludes almost every page.)
  matcher: ["/((?!api|emlk-xyz|uploads|_next|_vercel|demo|.*\\..*).*)"],
};
