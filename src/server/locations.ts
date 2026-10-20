import "server-only";
import { cache } from "react";
import { db } from "@/server/db";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import type { AppLocale } from "@/i18n/routing";

/** All reference data needed by search filters and forms, in one round trip. */
export const getReferenceData = cache(async () => {
  const [districts, neighborhoods, metros, universities, amenities] = await Promise.all([
    db.district.findMany({ select: { id: true, slug: true, sortOrder: true, ...nameSelect }, orderBy: [{ sortOrder: "asc" }, { nameAz: "asc" }] }),
    db.neighborhood.findMany({
      select: { id: true, slug: true, districtId: true, isPopular: true, ...nameSelect },
      orderBy: { nameAz: "asc" },
    }),
    db.metroStation.findMany({ select: { id: true, slug: true, line: true, districtId: true, ...nameSelect }, orderBy: { nameAz: "asc" } }),
    db.university.findMany({
      select: { id: true, slug: true, shortName: true, districtId: true, nearestMetroId: true, ...nameSelect },
      orderBy: { shortName: "asc" },
    }),
    db.amenity.findMany({ select: { id: true, key: true, icon: true, sortOrder: true, ...nameSelect }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { districts, neighborhoods, metros, universities, amenities };
});

export type ReferenceData = Awaited<ReturnType<typeof getReferenceData>>;

export interface Option {
  value: string;
  label: string;
  group?: string;
  hint?: string;
}

/** Locale-resolved options for selects. Values are ids (forms) or slugs (search URLs). */
export async function getLocationOptions(locale: AppLocale, by: "id" | "slug") {
  const ref = await getReferenceData();
  const key = (r: { id: string; slug: string }) => (by === "id" ? r.id : r.slug);
  const districtName = new Map(ref.districts.map((d) => [d.id, nameOf(d, locale)]));
  const collator = new Intl.Collator(locale);
  return {
    districts: ref.districts.map((d) => ({ value: key(d), label: nameOf(d, locale), id: d.id, slug: d.slug })),
    neighborhoods: ref.neighborhoods
      .map((n) => ({ value: key(n), slug: n.slug, label: nameOf(n, locale), group: districtName.get(n.districtId), districtId: n.districtId, districtValue: by === "id" ? n.districtId : ref.districts.find((d) => d.id === n.districtId)?.slug ?? "" }))
      .sort((a, b) => collator.compare(a.label, b.label)),
    metros: ref.metros
      .map((m) => ({ value: key(m), slug: m.slug, label: nameOf(m, locale), line: m.line }))
      .sort((a, b) => collator.compare(a.label, b.label)),
    universities: ref.universities.map((u) => ({ value: key(u), slug: u.slug, label: `${u.shortName} — ${nameOf(u, locale)}`, short: u.shortName })),
    amenities: ref.amenities.map((a) => ({ value: a.id, key: a.key, icon: a.icon, label: nameOf(a, locale) })),
  };
}

export type LocationOptions = Awaited<ReturnType<typeof getLocationOptions>>;
