import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intl = createMiddleware(routing);

/**
 * Public routes are always locale-prefixed (/az, /tr, /ru, /en). A new visitor
 * lands on Azerbaijani: Accept-Language is stripped before next-intl sees the
 * request, so only the URL prefix or the remembered locale cookie decide.
 * /admin, /api and /uploads are excluded by the matcher (admin is az-only).
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  return intl(new NextRequest(request.url, { headers, method: request.method }));
}

export const config = {
  matcher: ["/((?!api|admin|uploads|_next|_vercel|demo|.*\..*).*)"],
};
