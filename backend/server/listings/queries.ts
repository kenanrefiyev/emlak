import "server-only";
import { cache } from "react";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import { UNIVERSITY_RADIUS_KM, approxPosition, distanceKm, ownAreaPosition, spread, universityNearness, universityPosition, type LatLng } from "@/lib/baku-geo";
import { PAGE_SIZE, SEGMENTS, type Segment } from "@/lib/domain";
import type { ListingFilters } from "@/lib/search/listing-filters";
import { rentalCosts, type Total } from "@/lib/costs";

/** A listing is publicly visible only while published, unexpired and its owner is active. */
export function publicListingWhere(now = new Date()): Prisma.ListingWhereInput {
  return { status: "PUBLISHED", expiresAt: { gt: now }, owner: { status: "ACTIVE" } };
}

const cardSelect = (locale: AppLocale) =>
  ({
    id: true,
    category: true,
    monthlyRent: true,
    pricePerPlace: true,
    deposit: true,
    commissionType: true,
    commissionValue: true,
    utilitiesCost: true,
    internet: true,
    internetCost: true,
    otherCosts: true,
    costSharers: true,
    availability: true,
    rooms: true,
    areaSqm: true,
    residentsCount: true,
    availableSpaces: true,
    furnishing: true,
    utilities: true,
    genderPreference: true,
    availableFrom: true,
    isVerified: true,
    isDemo: true,
    publishedAt: true,
    originalLocale: true,
    addressPublic: true,
    districtId: true,
    district: { select: nameSelect },
    neighborhood: { select: { slug: true, latitude: true, longitude: true, ...nameSelect } },
    metroStation: { select: { line: true, slug: true, latitude: true, longitude: true, ...nameSelect } },
    university: { select: { shortName: true, slug: true, latitude: true, longitude: true, districtId: true } },
    owner: { select: { name: true, role: true, agentProfile: { select: { verificationStatus: true, companyName: true } } } },
    translations: {
      where: { OR: [{ locale }, { isOriginal: true }] },
      select: { locale: true, title: true, isOriginal: true, isMachine: true },
    },
    images: { orderBy: { position: "asc" }, take: 1, select: { url: true, width: true, height: true } },
    featured: { where: { startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, select: { id: true }, take: 1 },
  }) satisfies Prisma.ListingSelect;

type CardRow = Prisma.ListingGetPayload<{ select: ReturnType<typeof cardSelect> }>;

export interface ListingCardData {
  id: string;
  category: CardRow["category"];
  title: string;
  /** true when the title is shown in a language other than the visitor's */
  titleLocale: AppLocale;
  monthlyRent: number;
  pricePerPlace: boolean;
  commission: boolean;
  rooms: number | null;
  areaSqm: number | null;
  residentsCount: number | null;
  availableSpaces: number | null;
  furnishing: CardRow["furnishing"];
  utilities: CardRow["utilities"];
  /** Estimated monthly total (rent + running costs); see lib/costs. */
  monthlyTotal: Total;
  availability: CardRow["availability"];
  genderPreference: CardRow["genderPreference"];
  availableFrom: Date;
  isVerified: boolean;
  isDemo: boolean;
  isFeatured: boolean;
  byAgent: boolean;
  agentVerified: boolean;
  /** Agency name for agents, first name for private people. */
  ownerName: string;
  publishedAt: Date | null;
  district: string;
  neighborhood: string | null;
  metro: { name: string; line: "RED" | "GREEN" | "PURPLE" } | null;
  university: string | null;
  addressPublic: string | null;
  image: { url: string; width: number; height: number } | null;
}

export function pickTranslation<T extends { locale: string; isOriginal: boolean }>(rows: T[], locale: AppLocale): T | undefined {
  return rows.find((t) => t.locale === locale) ?? rows.find((t) => t.isOriginal) ?? rows[0];
}

/** A card names its university only when the listing really is near it. */
function nearbyUniversityLabel(row: CardRow): string | null {
  return row.university && universityNearness(row, row.university) ? row.university.shortName : null;
}

function toCard(row: CardRow, locale: AppLocale): ListingCardData {
  const tr = pickTranslation(row.translations, locale);
  return {
    id: row.id,
    category: row.category,
    title: tr?.title ?? "—",
    titleLocale: (tr?.locale as AppLocale) ?? row.originalLocale,
    monthlyRent: row.monthlyRent,
    pricePerPlace: row.pricePerPlace,
    commission: row.commissionType !== "NONE",
    rooms: row.rooms,
    areaSqm: row.areaSqm,
    residentsCount: row.residentsCount,
    availableSpaces: row.availableSpaces,
    furnishing: row.furnishing,
    utilities: row.utilities,
    monthlyTotal: rentalCosts(row).monthly,
    availability: row.availability,
    genderPreference: row.genderPreference,
    availableFrom: row.availableFrom,
    isVerified: row.isVerified,
    isDemo: row.isDemo,
    isFeatured: row.featured.length > 0,
    byAgent: row.owner.role === "AGENT",
    agentVerified: row.owner.agentProfile?.verificationStatus === "VERIFIED",
    ownerName:
      row.owner.role === "AGENT"
        ? (row.owner.agentProfile?.companyName ?? row.owner.name)
        : (row.owner.name.split(" ")[0] ?? row.owner.name),
    publishedAt: row.publishedAt,
    district: nameOf(row.district, locale),
    neighborhood: row.neighborhood ? nameOf(row.neighborhood, locale) : null,
    metro: row.metroStation ? { name: nameOf(row.metroStation, locale), line: row.metroStation.line } : null,
    university: nearbyUniversityLabel(row),
    addressPublic: row.addressPublic,
    image: row.images[0] ?? null,
  };
}

/** Translates URL filters into an indexed Prisma where clause. */
export function buildListingWhere(f: ListingFilters, segment?: Segment, now = new Date()): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [publicListingWhere(now)];
  const allowed = segment ? [...SEGMENTS[segment]] : undefined;
  const cats = f.categories.length ? f.categories : allowed;
  if (cats) and.push({ category: { in: cats } });
  if (f.district) and.push({ district: { slug: f.district } });
  if (f.neighborhood) and.push({ neighborhood: { slug: f.neighborhood } });
  if (f.metro) and.push({ metroStation: { slug: f.metro } });
  if (f.priceMin !== undefined || f.priceMax !== undefined)
    and.push({ monthlyRent: { gte: f.priceMin ?? undefined, lte: f.priceMax ?? undefined } });
  if (f.rooms) and.push({ rooms: f.rooms >= 4 ? { gte: 4 } : f.rooms });
  if (f.spaces) and.push({ availableSpaces: { gte: f.spaces } });
  if (f.furnishing) and.push({ furnishing: f.furnishing });
  if (f.utilities === "included") and.push({ utilities: "INCLUDED" });
  if (f.utilities === "excluded") and.push({ utilities: { in: ["PARTLY", "NOT_INCLUDED"] } });
  if (f.available) and.push({ availability: "AVAILABLE" });
  if (f.verifiedOwner)
    and.push({
      OR: [
        { owner: { role: "AGENT", agentProfile: { verificationStatus: "VERIFIED" } } },
        { owner: { role: { not: "AGENT" }, profile: { verificationStatus: "VERIFIED" } } },
      ],
    });
  if (f.moveIn) and.push({ availableFrom: { lte: new Date(`${f.moveIn}T00:00:00Z`) } });
  if (f.duration) and.push({ minDurationMonths: { lte: f.duration } });
  if (f.verified) and.push({ isVerified: true });
  if (f.postedWithin) and.push({ publishedAt: { gte: new Date(now.getTime() - f.postedWithin * 86_400_000) } });
  if (f.gender && f.gender !== "ANY") and.push({ genderPreference: { in: ["ANY", f.gender] } });
  if (f.q) {
    and.push({
      translations: {
        some: {
          OR: [
            { title: { contains: f.q, mode: "insensitive" } },
            { description: { contains: f.q, mode: "insensitive" } },
          ],
        },
      },
    });
  }
  return { AND: and };
}

function orderOf(sort: ListingFilters["sort"]): Prisma.ListingOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ monthlyRent: "asc" }, { publishedAt: "desc" }];
  if (sort === "price_desc") return [{ monthlyRent: "desc" }, { publishedAt: "desc" }];
  return [{ publishedAt: "desc" }, { id: "desc" }];
}

const placeFields = { slug: true, latitude: true, longitude: true } as const;

/**
 * Listings matching `where` whose own area lies within UNIVERSITY_RADIUS_KM of
 * `center`, nearest first. Positions are area-level (metro station or
 * neighborhood); listings with only a district are left out because their
 * distance cannot be judged. Capped at 3000 candidates.
 */
async function listingsNearPoint(center: LatLng, where: Prisma.ListingWhereInput) {
  const rows = await db.listing.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 3000,
    select: { id: true, monthlyRent: true, publishedAt: true, metroStation: { select: placeFields }, neighborhood: { select: placeFields } },
  });
  return rows
    .map((r) => {
      const at = ownAreaPosition(r);
      return { id: r.id, monthlyRent: r.monthlyRent, publishedAt: r.publishedAt, km: at ? distanceKm(center, at) : Infinity };
    })
    .filter((r) => r.km <= UNIVERSITY_RADIUS_KM)
    .sort((a, b) => a.km - b.km || (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
}

function formatKm(km: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.max(0.1, km));
}

/**
 * "Near a university" search: distance from the campus, not the owner's
 * university tag. The default order ("newest" in the URL) is nearest first.
 */
async function searchNearUniversity(f: ListingFilters & { university: string }, locale: AppLocale, segment?: Segment) {
  const uni = await db.university.findUnique({ where: { slug: f.university }, select: { shortName: true, ...placeFields } });
  const center = uni ? universityPosition(uni) : null;
  if (!uni || !center) return { items: [], total: 0, page: 1, pageCount: 1 };
  const near = await listingsNearPoint(center, buildListingWhere(f, segment));
  if (f.sort === "price_asc") near.sort((a, b) => a.monthlyRent - b.monthlyRent || a.km - b.km);
  if (f.sort === "price_desc") near.sort((a, b) => b.monthlyRent - a.monthlyRent || a.km - b.km);
  const total = near.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const slice = near.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const km = new Map(slice.map((r) => [r.id, r.km]));
  const items = (await cardsByIds(locale, slice.map((r) => r.id))).map((c) => ({
    ...c,
    university: `${uni.shortName} · ${formatKm(km.get(c.id)!, locale)} km`,
  }));
  return { items, total, page, pageCount };
}

/** Live listing counts within walking radius of each university, keyed by slug. */
export async function countsNearUniversities(unis: { slug: string; latitude: number | null; longitude: number | null }[], segment?: Segment) {
  const rows = await db.listing.findMany({
    where: { AND: [publicListingWhere(), segment ? { category: { in: [...SEGMENTS[segment]] } } : {}] },
    take: 3000,
    select: { metroStation: { select: placeFields }, neighborhood: { select: placeFields } },
  });
  const spots = rows.map(ownAreaPosition).filter((p): p is LatLng => p !== null);
  return new Map(
    unis.map((u) => {
      const c = universityPosition(u);
      return [u.slug, c ? spots.filter((p) => distanceKm(c, p) <= UNIVERSITY_RADIUS_KM).length : 0] as const;
    }),
  );
}

export interface MapPoint {
  id: string;
  title: string;
  monthlyRent: number;
  position: LatLng;
  image: string | null;
}

/**
 * Every listing matching the filters (capped) for the map view, placed at
 * area level like the detail-page map — never at the private address.
 * Listings with only a district are placed at the district centre.
 */
export async function searchMapPoints(f: ListingFilters, locale: AppLocale, segment?: Segment) {
  let where = buildListingWhere(f, segment);
  let center: LatLng | null = null;
  if (f.university) {
    const uni = await db.university.findUnique({ where: { slug: f.university }, select: placeFields });
    center = uni ? universityPosition(uni) : null;
    if (!center) return { points: [] as MapPoint[], center, capped: false };
    const near = await listingsNearPoint(center, where);
    where = { id: { in: near.map((r) => r.id).slice(0, 400) } };
  }
  const rows = await db.listing.findMany({
    where,
    orderBy: orderOf(f.sort),
    take: 401,
    select: {
      id: true,
      monthlyRent: true,
      district: { select: { slug: true } },
      metroStation: placeSelect,
      neighborhood: placeSelect,
      university: placeSelect,
      translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
  });
  const points: MapPoint[] = rows.slice(0, 400).map((r) => ({
    id: r.id,
    title: pickTranslation(r.translations, locale)?.title ?? "—",
    monthlyRent: r.monthlyRent,
    position: spread(approxPosition(r), r.id),
    image: r.images[0]?.url ?? null,
  }));
  return { points, center, capped: rows.length > 400 };
}

export async function searchListings(f: ListingFilters, locale: AppLocale, segment?: Segment) {
  if (f.university) return searchNearUniversity({ ...f, university: f.university }, locale, segment);
  const where = buildListingWhere(f, segment);
  const total = await db.listing.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const rows = await db.listing.findMany({
    where,
    orderBy: orderOf(f.sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: cardSelect(locale),
  });
  return { items: rows.map((r) => toCard(r, locale)), total, page, pageCount };
}

export async function listingCards(
  locale: AppLocale,
  where: Prisma.ListingWhereInput,
  take: number,
  orderBy: Prisma.ListingOrderByWithRelationInput[] = [{ publishedAt: "desc" }],
) {
  const rows = await db.listing.findMany({
    where: { AND: [publicListingWhere(), where] },
    orderBy,
    take,
    select: cardSelect(locale),
  });
  return rows.map((r) => toCard(r, locale));
}

export async function featuredListingCards(locale: AppLocale, take: number, segment?: Segment) {
  const now = new Date();
  return listingCards(
    locale,
    {
      featured: { some: { startsAt: { lte: now }, endsAt: { gt: now } } },
      ...(segment ? { category: { in: [...SEGMENTS[segment]] } } : {}),
    },
    take,
  );
}

export async function cardsByIds(locale: AppLocale, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.listing.findMany({ where: { id: { in: ids } }, select: cardSelect(locale) });
  const byId = new Map(rows.map((r) => [r.id, toCard(r, locale)]));
  return ids.map((id) => byId.get(id)).filter((c): c is ListingCardData => Boolean(c));
}

/** Full listing for the detail page. Non-public listings are returned only to the owner or an admin. */
export const getListingDetail = cache(async (id: string, viewer: { id: string; role: string } | null) => {
  if (!/^[a-z0-9]{10,40}$/.test(id)) return null;
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      translations: true,
      images: { orderBy: { position: "asc" } },
      amenities: { include: { amenity: true }, orderBy: { amenity: { sortOrder: "asc" } } },
      district: true,
      neighborhood: true,
      metroStation: true,
      university: { include: { nearestMetro: true } },
      owner: {
        select: {
          id: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          agentProfile: true,
          profile: { select: { verificationStatus: true, languages: true } },
        },
      },
      featured: { where: { startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, take: 1 },
    },
  });
  if (!listing) return null;
  const isPublic =
    listing.status === "PUBLISHED" && (listing.expiresAt ?? new Date(0)) > new Date() && listing.owner.status === "ACTIVE";
  const canManage = !!viewer && (viewer.id === listing.ownerId || viewer.role === "ADMIN");
  if (!isPublic && !canManage) return null;
  return { listing, isPublic, canManage };
});

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListingDetail>>>;

export async function similarListings(locale: AppLocale, l: { id: string; category: string; districtId: string; monthlyRent: number }) {
  return listingCards(
    locale,
    {
      id: { not: l.id },
      category: l.category as CardRow["category"],
      OR: [{ districtId: l.districtId }, { monthlyRent: { gte: Math.round(l.monthlyRent * 0.75), lte: Math.round(l.monthlyRent * 1.25) } }],
    },
    4,
  );
}

const placeSelect = { select: { slug: true, latitude: true, longitude: true } } as const;

export interface NearbyMapPoint {
  id: string;
  title: string;
  monthlyRent: number;
  pricePerPlace: boolean;
  category: CardRow["category"];
  image: string | null;
  position: [number, number];
  distanceKm: number;
}

/**
 * Public listings around a listing, positioned at area level (see
 * approxPosition). Candidates are capped so the page stays cheap; the
 * nearest `take` within `radiusKm` are returned.
 */
export async function nearbyListings(
  locale: AppLocale,
  l: { id: string; district: { slug: string }; metroStation: PlaceRow; neighborhood: PlaceRow; university: PlaceRow },
  radiusKm = 4,
  take = 15,
) {
  const center = approxPosition(l);
  const rows = await db.listing.findMany({
    where: { AND: [publicListingWhere(), { id: { not: l.id } }] },
    orderBy: { publishedAt: "desc" },
    take: 500,
    select: {
      id: true,
      category: true,
      monthlyRent: true,
      pricePerPlace: true,
      district: { select: { slug: true } },
      metroStation: placeSelect,
      neighborhood: placeSelect,
      university: placeSelect,
      translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
  });
  const points: NearbyMapPoint[] = rows
    .map((r) => {
      const base = approxPosition(r);
      return {
        id: r.id,
        title: pickTranslation(r.translations, locale)?.title ?? "—",
        monthlyRent: r.monthlyRent,
        pricePerPlace: r.pricePerPlace,
        category: r.category,
        image: r.images[0]?.url ?? null,
        position: spread(base, r.id),
        distanceKm: distanceKm(center, base),
      };
    })
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, take);
  return { center, points };
}

type PlaceRow = { slug: string; latitude: number | null; longitude: number | null } | null;

/**
 * Universities within walking radius of the listing's own area (metro station
 * or neighborhood), nearest first. Empty when only the district is known —
 * too coarse to give a distance.
 */
export async function universitiesNear(l: { metroStation: PlaceRow; neighborhood: PlaceRow }, locale: AppLocale) {
  const at = ownAreaPosition(l);
  if (!at) return [];
  const unis = await db.university.findMany({ select: { slug: true, shortName: true, latitude: true, longitude: true, ...nameSelect } });
  return unis
    .map((u) => {
      const c = universityPosition(u);
      return { slug: u.slug, shortName: u.shortName, name: nameOf(u, locale), km: c ? distanceKm(at, c) : Infinity };
    })
    .filter((u) => u.km <= UNIVERSITY_RADIUS_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);
}
