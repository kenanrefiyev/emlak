import "server-only";
import { db } from "@/server/db";
import { countsNearUniversities, publicListingWhere } from "@/server/listings/queries";
import { publicRoommateWhere } from "@/server/roommates/queries";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import type { AppLocale } from "@/i18n/routing";
import { SEGMENTS } from "@/lib/domain";
import { getCountries, listingInCountry, roommateInCountry } from "@/server/countries";

/** Popular neighborhoods with their live student-listing counts. */
export async function popularAreas(locale: AppLocale, country?: string) {
  const areas = await db.neighborhood.findMany({
    where: { isPopular: true, ...(country ? { district: { city: { country: { code: country } } } } : {}) },
    select: { id: true, slug: true, ...nameSelect, district: { select: { slug: true, ...nameSelect } } },
  });
  const counts = await db.listing.groupBy({
    by: ["neighborhoodId"],
    where: { AND: [publicListingWhere(), { neighborhoodId: { in: areas.map((a) => a.id) } }, { category: { in: [...SEGMENTS.students] } }] },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.neighborhoodId, c._count._all]));
  return areas
    .map((a) => ({
      slug: a.slug,
      districtSlug: a.district.slug,
      name: nameOf(a, locale),
      district: nameOf(a.district, locale),
      count: byId.get(a.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));
}

/** Universities with their nearest metro and live student-listing counts within walking radius. */
export async function universitiesWithCounts(locale: AppLocale, country?: string) {
  const unis = await db.university.findMany({
    where: country ? { city: { country: { code: country } } } : undefined,
    select: {
      id: true,
      slug: true,
      shortName: true,
      latitude: true,
      longitude: true,
      ...nameSelect,
      nearestMetro: { select: { line: true, ...nameSelect } },
      district: { select: nameSelect },
    },
    orderBy: { shortName: "asc" },
  });
  const counts = await countsNearUniversities(unis, "students");
  return unis.map((u) => ({
    slug: u.slug,
    short: u.shortName,
    name: nameOf(u, locale),
    metro: u.nearestMetro ? { name: nameOf(u.nearestMetro, locale), line: u.nearestMetro.line } : null,
    district: u.district ? nameOf(u.district, locale) : null,
    count: counts.get(u.slug) ?? 0,
  }));
}

export async function liveCounts(country?: string) {
  const [listings, roommates] = await Promise.all([
    db.listing.count({ where: { AND: [publicListingWhere(), country ? listingInCountry(country) : {}] } }),
    db.roommateAd.count({ where: { AND: [publicRoommateWhere(), country ? roommateInCountry(country) : {}] } }),
  ]);
  return { listings, roommates };
}

/**
 * The market's leading districts — its first city's, in admin sort order —
 * with their live student-listing counts.
 */
export async function districtsWithCounts(locale: AppLocale, country: string, take: number) {
  const rows = await db.district.findMany({
    where: { city: { country: { code: country } } },
    orderBy: [{ city: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take,
    select: { id: true, slug: true, ...nameSelect },
  });
  const counts = await db.listing.groupBy({
    by: ["districtId"],
    where: { AND: [publicListingWhere(), { districtId: { in: rows.map((r) => r.id) } }, { category: { in: [...SEGMENTS.students] } }] },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.districtId, c._count._all]));
  return rows.map((r) => ({ slug: r.slug, name: nameOf(r, locale), count: byId.get(r.id) ?? 0 }));
}

/** Each active market with its city count and live listing and roommate-ad counts, for "Choose your country". */
export async function marketOverview(locale: AppLocale) {
  const countries = await getCountries();
  return Promise.all(
    countries.map(async (c) => {
      const [listings, roommates] = await Promise.all([
        db.listing.count({ where: { AND: [publicListingWhere(), listingInCountry(c.code)] } }),
        db.roommateAd.count({ where: { AND: [publicRoommateWhere(), roommateInCountry(c.code)] } }),
      ]);
      return { code: c.code, name: nameOf(c, locale), cities: c.cities.length, listings, roommates };
    }),
  );
}

/** The market's popular cities (admin-chosen) with live student-listing and roommate-ad counts. */
export async function popularCities(locale: AppLocale, country: string) {
  const market = (await getCountries()).find((c) => c.code === country);
  const cities = (market?.cities ?? []).filter((c) => c.isPopular);
  const [listingRows, roommateRows] = await Promise.all([
    db.district.findMany({
      where: { cityId: { in: cities.map((c) => c.id) } },
      select: { cityId: true, _count: { select: { listings: { where: { AND: [publicListingWhere(), { category: { in: [...SEGMENTS.students] } }] } } } } },
    }),
    db.roommateAd.groupBy({ by: ["cityId"], where: { AND: [publicRoommateWhere(), { cityId: { in: cities.map((c) => c.id) } }] }, _count: { _all: true } }),
  ]);
  return cities.map((c) => ({
    slug: c.slug,
    name: nameOf(c, locale),
    listings: listingRows.filter((d) => d.cityId === c.id).reduce((n, d) => n + d._count.listings, 0),
    roommates: roommateRows.find((r) => r.cityId === c.id)?._count._all ?? 0,
  }));
}
