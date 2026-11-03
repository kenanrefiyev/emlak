import "server-only";
import { cache } from "react";
import { db } from "@/server/db";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import type { AppLocale } from "@/i18n/routing";

// Admin-set positions; places without them fall back to the built-in Baku tables (lib/baku-geo).
const at = { latitude: true, longitude: true } as const;

/** All reference data needed by search filters and forms, in one round trip. */
export const getReferenceData = cache(async () => {
  const [cities, districts, neighborhoods, metros, universities, amenities] = await Promise.all([
    db.city.findMany({
      select: { id: true, slug: true, sortOrder: true, isPopular: true, country: { select: { code: true } }, ...at, ...nameSelect },
      orderBy: [{ country: { sortOrder: "asc" } }, { sortOrder: "asc" }, { nameEn: "asc" }],
    }),
    db.district.findMany({
      select: { id: true, slug: true, cityId: true, sortOrder: true, ...at, ...nameSelect },
      // City by city, so a market's districts are grouped in selects.
      orderBy: [{ city: { country: { sortOrder: "asc" } } }, { city: { sortOrder: "asc" } }, { sortOrder: "asc" }, { nameAz: "asc" }],
    }),
    db.neighborhood.findMany({
      select: { id: true, slug: true, districtId: true, isPopular: true, ...at, ...nameSelect },
      orderBy: { nameAz: "asc" },
    }),
    db.metroStation.findMany({ select: { id: true, slug: true, line: true, cityId: true, districtId: true, ...at, ...nameSelect }, orderBy: { nameAz: "asc" } }),
    db.university.findMany({
      select: { id: true, slug: true, shortName: true, cityId: true, districtId: true, nearestMetroId: true, ...at, ...nameSelect },
      orderBy: { shortName: "asc" },
    }),
    db.amenity.findMany({ select: { id: true, key: true, icon: true, sortOrder: true, ...nameSelect }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { cities, districts, neighborhoods, metros, universities, amenities };
});

export type ReferenceData = Awaited<ReturnType<typeof getReferenceData>>;

export interface Option {
  value: string;
  label: string;
  group?: string;
  hint?: string;
}

/**
 * Locale-resolved options for selects. Values are ids (forms) or slugs (search
 * URLs). With `country` (a country code) every list is limited to that market,
 * so places from different countries are never mixed in one select.
 */
export async function getLocationOptions(locale: AppLocale, by: "id" | "slug", country?: string) {
  const ref = await getReferenceData();
  const key = (r: { id: string; slug: string }) => (by === "id" ? r.id : r.slug);
  const cities = country ? ref.cities.filter((c) => c.country.code === country) : ref.cities;
  const cityIds = new Set(cities.map((c) => c.id));
  const city = new Map(cities.map((c) => [c.id, c]));
  const districts = ref.districts.filter((d) => cityIds.has(d.cityId));
  const district = new Map(districts.map((d) => [d.id, d]));
  const collator = new Intl.Collator(locale);
  return {
    cities: cities.map((c) => ({ value: key(c), label: nameOf(c, locale), id: c.id, slug: c.slug, country: c.country.code, isPopular: c.isPopular, latitude: c.latitude, longitude: c.longitude })),
    districts: districts.map((d) => {
      const c = city.get(d.cityId)!;
      return { value: key(d), label: nameOf(d, locale), id: d.id, slug: d.slug, group: nameOf(c, locale), cityValue: key(c), latitude: d.latitude, longitude: d.longitude };
    }),
    neighborhoods: ref.neighborhoods
      .filter((n) => district.has(n.districtId))
      .map((n) => {
        const d = district.get(n.districtId)!;
        return { value: key(n), slug: n.slug, label: nameOf(n, locale), group: nameOf(d, locale), districtId: n.districtId, districtValue: key(d), latitude: n.latitude, longitude: n.longitude };
      })
      .sort((a, b) => collator.compare(a.label, b.label)),
    metros: ref.metros
      .filter((m) => cityIds.has(m.cityId))
      .map((m) => ({ value: key(m), slug: m.slug, label: nameOf(m, locale), line: m.line, cityValue: key(city.get(m.cityId)!), latitude: m.latitude, longitude: m.longitude }))
      .sort((a, b) => collator.compare(a.label, b.label)),
    universities: ref.universities
      .filter((u) => cityIds.has(u.cityId))
      .map((u) => ({ value: key(u), slug: u.slug, label: `${u.shortName} — ${nameOf(u, locale)}`, short: u.shortName, cityValue: key(city.get(u.cityId)!), latitude: u.latitude, longitude: u.longitude })),
    amenities: ref.amenities.map((a) => ({ value: a.id, key: a.key, icon: a.icon, label: nameOf(a, locale) })),
  };
}

export type LocationOptions = Awaited<ReturnType<typeof getLocationOptions>>;
