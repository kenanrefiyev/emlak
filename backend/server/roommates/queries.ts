import "server-only";
import { cache } from "react";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import { PAGE_SIZE } from "@/lib/domain";
import type { RoommateFilters } from "@/lib/search/roommate-filters";
import { matchAds, type MatchableAd, type MatchResult } from "@/lib/matching";

export function publicRoommateWhere(now = new Date()): Prisma.RoommateAdWhereInput {
  return { status: "PUBLISHED", expiresAt: { gt: now }, owner: { status: "ACTIVE" } };
}

const cardSelect = {
  id: true,
  type: true,
  title: true,
  originalLocale: true,
  isDemo: true,
  monthlyContribution: true,
  budgetMin: true,
  budgetMax: true,
  accommodationType: true,
  desiredPropertyType: true,
  currentResidents: true,
  availableSpaces: true,
  groupSize: true,
  moveInDate: true,
  durationMonths: true,
  genderPreference: true,
  smoking: true,
  sleepSchedule: true,
  cleaning: true,
  noise: true,
  districtId: true,
  publishedAt: true,
  district: { select: nameSelect },
  neighborhood: { select: nameSelect },
  metroStation: { select: { line: true, ...nameSelect } },
  university: { select: { shortName: true } },
  preferredDistricts: { select: { districtId: true, district: { select: nameSelect } } },
  owner: { select: { name: true } },
} satisfies Prisma.RoommateAdSelect;

type Row = Prisma.RoommateAdGetPayload<{ select: typeof cardSelect }>;

export function toMatchable(r: Row | (Omit<Row, "preferredDistricts"> & { preferredDistricts: { districtId: string }[] })): MatchableAd {
  return {
    id: r.id,
    type: r.type,
    monthlyContribution: r.monthlyContribution,
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    districtId: r.districtId,
    preferredDistrictIds: r.preferredDistricts.map((p) => p.districtId),
    moveInDate: r.moveInDate,
    durationMonths: r.durationMonths,
    accommodationType: r.accommodationType,
    desiredPropertyType: r.desiredPropertyType,
    availableSpaces: r.availableSpaces,
    groupSize: r.groupSize,
    smoking: r.smoking,
    sleepSchedule: r.sleepSchedule,
    cleaning: r.cleaning,
    noise: r.noise,
  };
}

function toCard(r: Row, locale: AppLocale, match?: MatchResult | null) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    originalLocale: r.originalLocale as AppLocale,
    isDemo: r.isDemo,
    monthlyContribution: r.monthlyContribution,
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    homeType: r.accommodationType ?? r.desiredPropertyType,
    currentResidents: r.currentResidents,
    availableSpaces: r.availableSpaces,
    groupSize: r.groupSize,
    moveInDate: r.moveInDate,
    durationMonths: r.durationMonths,
    genderPreference: r.genderPreference,
    smoking: r.smoking,
    area: r.district
      ? r.metroStation
        ? nameOf(r.district, locale)
        : [r.neighborhood ? nameOf(r.neighborhood, locale) : null, nameOf(r.district, locale)].filter(Boolean).join(", ")
      : r.preferredDistricts.map((p) => nameOf(p.district, locale)).join(", "),
    metro: r.metroStation ? { name: nameOf(r.metroStation, locale), line: r.metroStation.line } : null,
    university: r.university?.shortName ?? null,
    firstName: r.owner.name.split(" ")[0] ?? r.owner.name,
    publishedAt: r.publishedAt,
    match: match ?? null,
  };
}

export type RoommateCardData = ReturnType<typeof toCard>;

export function buildRoommateWhere(f: RoommateFilters, now = new Date()): Prisma.RoommateAdWhereInput {
  const and: Prisma.RoommateAdWhereInput[] = [publicRoommateWhere(now)];
  if (f.type) and.push({ type: f.type });
  if (f.district)
    and.push({ OR: [{ district: { slug: f.district } }, { preferredDistricts: { some: { district: { slug: f.district } } } }] });
  if (f.university) and.push({ university: { slug: f.university } });
  if (f.budget)
    and.push({
      OR: [
        { type: "HAS_PLACE", monthlyContribution: { lte: f.budget } },
        { type: "SEEKING_PARTNER", budgetMin: { lte: f.budget } },
      ],
    });
  if (f.moveIn) {
    const d = new Date(`${f.moveIn}T00:00:00Z`).getTime();
    and.push({ moveInDate: { gte: new Date(d - 30 * 86_400_000), lte: new Date(d + 30 * 86_400_000) } });
  }
  if (f.gender && f.gender !== "ANY") and.push({ genderPreference: { in: ["ANY", f.gender] } });
  if (f.smoking) and.push({ smoking: f.smoking });
  return { AND: and };
}

/** The viewer's own newest published ad, used as the reference for match scores. */
export const viewerReferenceAd = cache(async (userId: string | undefined) => {
  if (!userId) return null;
  const ad = await db.roommateAd.findFirst({
    where: { ownerId: userId, ...publicRoommateWhere() },
    orderBy: { publishedAt: "desc" },
    select: cardSelect,
  });
  return ad ? toMatchable(ad) : null;
});

export async function searchRoommates(f: RoommateFilters, locale: AppLocale, viewerId?: string) {
  const where = buildRoommateWhere(f);
  const reference = await viewerReferenceAd(viewerId);
  const total = await db.roommateAd.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);

  if (f.sort === "match" && reference) {
    // Score the candidate set in memory (bounded), then paginate.
    const rows = await db.roommateAd.findMany({ where, select: cardSelect, take: 500, orderBy: { publishedAt: "desc" } });
    const scored = rows
      .map((r) => ({ r, m: matchAds(reference, toMatchable(r)) }))
      .sort((a, b) => (b.m?.score ?? -1) - (a.m?.score ?? -1));
    const slice = scored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { items: slice.map(({ r, m }) => toCard(r, locale, m)), total, page, pageCount, hasReference: true };
  }

  const rows = await db.roommateAd.findMany({
    where,
    select: cardSelect,
    orderBy:
      f.sort === "price_asc"
        ? [{ monthlyContribution: { sort: "asc", nulls: "last" } }, { budgetMin: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return {
    items: rows.map((r) => toCard(r, locale, reference ? matchAds(reference, toMatchable(r)) : null)),
    total,
    page,
    pageCount,
    hasReference: Boolean(reference),
  };
}

export async function roommateCards(locale: AppLocale, where: Prisma.RoommateAdWhereInput, take: number) {
  const rows = await db.roommateAd.findMany({
    where: { AND: [publicRoommateWhere(), where] },
    select: cardSelect,
    orderBy: { publishedAt: "desc" },
    take,
  });
  return rows.map((r) => toCard(r, locale));
}

/** Best matches for one of the user's own ads (dashboard). */
export async function matchesForAd(adId: string, ownerId: string, locale: AppLocale, take = 6) {
  const own = await db.roommateAd.findFirst({ where: { id: adId, ownerId }, select: cardSelect });
  if (!own) return [];
  const reference = toMatchable(own);
  const rows = await db.roommateAd.findMany({
    where: {
      AND: [publicRoommateWhere(), { ownerId: { not: ownerId } }, own.type === "HAS_PLACE" ? { type: "SEEKING_PARTNER" } : {}],
    },
    select: cardSelect,
    take: 500,
    orderBy: { publishedAt: "desc" },
  });
  return rows
    .map((r) => ({ r, m: matchAds(reference, toMatchable(r)) }))
    .filter((x) => x.m && x.m.score >= 40)
    .sort((a, b) => (b.m?.score ?? 0) - (a.m?.score ?? 0))
    .slice(0, take)
    .map(({ r, m }) => toCard(r, locale, m));
}

export const getRoommateDetail = cache(async (id: string, viewer: { id: string; role: string } | null) => {
  if (!/^[a-z0-9]{10,40}$/.test(id)) return null;
  const ad = await db.roommateAd.findUnique({
    where: { id },
    include: {
      district: true,
      neighborhood: true,
      metroStation: true,
      university: true,
      preferredDistricts: { include: { district: true } },
      listing: { select: { id: true, status: true } },
      owner: { select: { id: true, name: true, status: true, createdAt: true, profile: { select: { hometown: true, studyYear: true, bio: true, university: { select: { shortName: true } } } } } },
    },
  });
  if (!ad) return null;
  const isPublic = ad.status === "PUBLISHED" && (ad.expiresAt ?? new Date(0)) > new Date() && ad.owner.status === "ACTIVE";
  const canManage = !!viewer && (viewer.id === ad.ownerId || viewer.role === "ADMIN");
  if (!isPublic && !canManage) return null;
  return { ad, isPublic, canManage };
});
