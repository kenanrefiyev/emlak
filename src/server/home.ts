import "server-only";
import { db } from "@/server/db";
import { publicListingWhere } from "@/server/listings/queries";
import { publicRoommateWhere } from "@/server/roommates/queries";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import type { AppLocale } from "@/i18n/routing";
import { SEGMENTS } from "@/lib/domain";

/** Popular neighborhoods with their live student-listing counts. */
export async function popularAreas(locale: AppLocale) {
  const areas = await db.neighborhood.findMany({
    where: { isPopular: true },
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

/** Universities with their nearest metro (when known) and live listing counts. */
export async function universitiesWithCounts(locale: AppLocale) {
  const unis = await db.university.findMany({
    select: {
      id: true,
      slug: true,
      shortName: true,
      ...nameSelect,
      nearestMetro: { select: { line: true, ...nameSelect } },
      district: { select: nameSelect },
    },
    orderBy: { shortName: "asc" },
  });
  const counts = await db.listing.groupBy({
    by: ["universityId"],
    where: { AND: [publicListingWhere(), { universityId: { not: null } }] },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.universityId, c._count._all]));
  return unis.map((u) => ({
    slug: u.slug,
    short: u.shortName,
    name: nameOf(u, locale),
    metro: u.nearestMetro ? { name: nameOf(u.nearestMetro, locale), line: u.nearestMetro.line } : null,
    district: u.district ? nameOf(u.district, locale) : null,
    count: byId.get(u.id) ?? 0,
  }));
}

export async function liveCounts() {
  const [listings, roommates] = await Promise.all([
    db.listing.count({ where: publicListingWhere() }),
    db.roommateAd.count({ where: publicRoommateWhere() }),
  ]);
  return { listings, roommates };
}

/** Districts (in the given order) with their live student-listing counts. */
export async function districtsWithCounts(locale: AppLocale, slugs: string[]) {
  const rows = await db.district.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, ...nameSelect } });
  const counts = await db.listing.groupBy({
    by: ["districtId"],
    where: { AND: [publicListingWhere(), { districtId: { in: rows.map((r) => r.id) } }, { category: { in: [...SEGMENTS.students] } }] },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.districtId, c._count._all]));
  return slugs
    .map((slug) => rows.find((r) => r.slug === slug))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ slug: r.slug, name: nameOf(r, locale), count: byId.get(r.id) ?? 0 }));
}
