import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { resolveSegment, toPublicPath, toRoutePath } from "@/i18n/paths";
import { alternatesFor, openGraphFor, siteUrl } from "@/lib/seo";

describe("localized URLs", () => {
  it("maps routes to each language's public path, keeping the rest of the URL", () => {
    expect(toPublicPath("/students?district=yasamal&page=2", "az")).toBe("/evler?district=yasamal&page=2");
    expect(toPublicPath("/students", "en")).toBe("/housing");
    expect(toPublicPath("/roommates/new", "tr")).toBe("/ev-arkadasi/new");
    expect(toPublicPath("/roommates/abc123", "az")).toBe("/ev-yoldasi/abc123");
    expect(toPublicPath("/roommates", "en")).toBe("/roommates");
    expect(toPublicPath("/cities/istanbul", "tr")).toBe("/sehirler/istanbul");
    expect(toPublicPath("/cities/baku", "az")).toBe("/seherler/baku");
    // Routes without a localized name are untouched.
    expect(toPublicPath("/listings/abc", "az")).toBe("/listings/abc");
    expect(toPublicPath("/", "az")).toBe("/");
  });

  it("maps every public path back to its route in every language", () => {
    for (const locale of locales)
      for (const route of ["/students", "/roommates/new", "/cities/izmir", "/family", "/areas"]) expect(toRoutePath(toPublicPath(route, locale), locale)).toBe(route);
  });

  it("tells the proxy what to rewrite and what to redirect", () => {
    expect(resolveSegment("evler", "az")).toEqual({ rewriteTo: "students" });
    expect(resolveSegment("students", "az")).toEqual({ redirectTo: "evler" });
    expect(resolveSegment("roommates", "az")).toEqual({ redirectTo: "ev-yoldasi" });
    // /en/roommates is both route and public path: nothing to do.
    expect(resolveSegment("roommates", "en")).toBeNull();
    // Another language's public name is not valid here (it 404s rather than mixing languages).
    expect(resolveSegment("housing", "az")).toBeNull();
    expect(resolveSegment("areas", "az")).toBeNull();
  });

  it("gives every language its own canonical and hreflang URL", () => {
    const a = alternatesFor("tr", "/students");
    expect(a.canonical).toBe(`${siteUrl()}/tr/evler`);
    expect(a.languages).toMatchObject({ az: `${siteUrl()}/az/evler`, en: `${siteUrl()}/en/housing`, ru: `${siteUrl()}/ru/housing`, "x-default": `${siteUrl()}/az/evler` });
    expect(alternatesFor("az", "/").canonical).toBe(`${siteUrl()}/az`);
  });

  it("keeps site name and og:locale on pages with their own Open Graph", () => {
    expect(openGraphFor("az", { title: "x" })).toMatchObject({ siteName: "Yuva", locale: "az_AZ", title: "x", alternateLocale: ["tr_TR", "ru_RU", "en_US"] });
  });
});
