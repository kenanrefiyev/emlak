import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { pickTranslation } from "@/server/listings/queries";
import { archiveListing, deleteListing, markRented, renewListing, submitListing, type Actor } from "@/server/listings/service";
import type { AppLocale } from "@/i18n/routing";
import { Prisma, type LeadStatus, type ListingCategory, type ListingEventType } from "@/generated/prisma/client";
import { LISTING_CATEGORIES } from "@/lib/domain";

const DAY = 86_400_000;

/** Landlords (owners and students who rent out a place) vs. realtors. */
export type DashboardKind = "landlord" | "realtor";
export const dashboardKind = (role: string): DashboardKind => (role === "AGENT" ? "realtor" : "landlord");

// ───────────── listing status as the owner sees it ─────────────

export const OWNER_STATUSES = ["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "EXPIRED", "REJECTED", "RENTED", "ARCHIVED"] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];

/** "Active" and "expired" are both PUBLISHED in the database; the expiry date decides. */
export function ownerStatusOf(l: { status: string; expiresAt: Date | null }, now = new Date()): Exclude<OwnerStatus, "ALL"> {
  if (l.status === "PUBLISHED") return l.expiresAt && l.expiresAt <= now ? "EXPIRED" : "ACTIVE";
  return l.status as Exclude<OwnerStatus, "ALL" | "ACTIVE" | "EXPIRED">;
}

function statusWhere(s: OwnerStatus, now: Date): Prisma.ListingWhereInput {
  switch (s) {
    case "ALL":
      return {};
    case "ACTIVE":
      return { status: "PUBLISHED", expiresAt: { gt: now } };
    case "EXPIRED":
      return { status: "PUBLISHED", OR: [{ expiresAt: { lte: now } }, { expiresAt: null }] };
    default:
      return { status: s };
  }
}

// ───────────── overview ─────────────

export async function dashboardOverview(userId: string, locale: AppLocale) {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const soon = new Date(now.getTime() + 7 * DAY);
  const [byStatus, expiredCount, activeCount, viewsAll, views30, inquiriesAll, inquiriesNew, inquiriesPending, recentInquiries, expiring, recentListings] =
    await Promise.all([
      db.listing.groupBy({ by: ["status"], where: { ownerId: userId }, _count: { _all: true } }),
      db.listing.count({ where: { ownerId: userId, ...statusWhere("EXPIRED", now) } }),
      db.listing.count({ where: { ownerId: userId, ...statusWhere("ACTIVE", now) } }),
      db.listingEvent.count({ where: { type: "VIEW", listing: { ownerId: userId } } }),
      db.listingEvent.count({ where: { type: "VIEW", createdAt: { gte: since30 }, listing: { ownerId: userId } } }),
      db.contactRequest.count({ where: { recipientId: userId, listingId: { not: null } } }),
      db.contactRequest.count({ where: { recipientId: userId, listingId: { not: null }, leadStatus: "NEW" } }),
      db.contactRequest.count({ where: { recipientId: userId, listingId: { not: null }, status: "PENDING" } }),
      db.contactRequest.findMany({
        where: { recipientId: userId, listingId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          status: true,
          leadStatus: true,
          message: true,
          sender: { select: { name: true } },
          listing: { select: { id: true, translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } } } },
        },
      }),
      db.listing.findMany({
        where: { ownerId: userId, status: "PUBLISHED", expiresAt: { gt: now, lte: soon } },
        orderBy: { expiresAt: "asc" },
        take: 5,
        select: { id: true, expiresAt: true, translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } } },
      }),
      db.listing.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          expiresAt: true,
          submittedAt: true,
          publishedAt: true,
          rentedAt: true,
          createdAt: true,
          updatedAt: true,
          rejectionReason: true,
          translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } },
        },
      }),
    ]);
  const count = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const total = byStatus.reduce((n, r) => n + r._count._all, 0);

  // Activity is derived from real timestamps on the owner's listings and inquiries.
  type Activity = { at: Date; kind: "inquiry" | "published" | "submitted" | "rejected" | "rented" | "created"; title: string; href: string };
  const activity: Activity[] = [];
  for (const l of recentListings) {
    const title = pickTranslation(l.translations, locale)?.title ?? "—";
    const href = `/dashboard/listings/${l.id}/edit`;
    if (l.status === "REJECTED") activity.push({ at: l.updatedAt, kind: "rejected", title, href });
    if (l.rentedAt) activity.push({ at: l.rentedAt, kind: "rented", title, href });
    if (l.publishedAt) activity.push({ at: l.publishedAt, kind: "published", title, href });
    if (l.submittedAt) activity.push({ at: l.submittedAt, kind: "submitted", title, href });
    activity.push({ at: l.createdAt, kind: "created", title, href });
  }
  for (const r of recentInquiries) {
    activity.push({
      at: r.createdAt,
      kind: "inquiry",
      title: `${r.sender.name.split(" ")[0]} · ${pickTranslation(r.listing?.translations ?? [], locale)?.title ?? "—"}`,
      href: "/dashboard/inquiries",
    });
  }
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    totals: {
      total,
      active: activeCount,
      pending: count("PENDING_REVIEW"),
      draft: count("DRAFT"),
      rejected: count("REJECTED"),
      unavailable: count("RENTED") + count("ARCHIVED") + expiredCount,
      views: viewsAll,
      views30,
      inquiries: inquiriesAll,
      inquiriesNew,
      inquiriesPending,
    },
    recentInquiries: recentInquiries.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      leadStatus: r.leadStatus,
      message: r.message,
      name: r.sender.name.split(" ")[0] ?? r.sender.name,
      listingTitle: pickTranslation(r.listing?.translations ?? [], locale)?.title ?? "—",
    })),
    expiring: expiring.map((l) => ({ id: l.id, expiresAt: l.expiresAt!, title: pickTranslation(l.translations, locale)?.title ?? "—" })),
    activity: activity.slice(0, 8),
  };
}

// ───────────── time series ─────────────

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const parseRange = (v: unknown): Range => (RANGES.includes(Number(v) as Range) ? (Number(v) as Range) : 30);

/** Daily counts (UTC days) of each event type on the owner's listings, zero-filled. */
export async function dailyEvents(ownerId: string, days: number, listingId?: string) {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await db.$queryRaw<{ day: Date; type: ListingEventType; n: bigint }[]>`
    SELECT date_trunc('day', e.created_at AT TIME ZONE 'UTC') AS day, e.type, count(*) AS n
    FROM listing_events e
    JOIN listings l ON l.id = e.listing_id
    WHERE l.owner_id = ${ownerId}
      AND e.created_at >= ${since}
      ${listingId ? Prisma.sql`AND e.listing_id = ${listingId}` : Prisma.empty}
    GROUP BY 1, 2`;
  const series: { day: string; VIEW: number; IMPRESSION: number; SAVE: number; CONTACT_REQUEST: number; PHONE_REVEAL: number; WHATSAPP_CLICK: number }[] = [];
  const index = new Map<string, (typeof series)[number]>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    const row = { day: d, VIEW: 0, IMPRESSION: 0, SAVE: 0, CONTACT_REQUEST: 0, PHONE_REVEAL: 0, WHATSAPP_CLICK: 0 };
    series.push(row);
    index.set(d, row);
  }
  for (const r of rows) {
    const row = index.get(new Date(r.day).toISOString().slice(0, 10));
    if (row) row[r.type] = Number(r.n);
  }
  return series;
}

type Counts = Record<ListingEventType, number>;
const zero = (): Counts => ({ VIEW: 0, IMPRESSION: 0, SAVE: 0, CONTACT_REQUEST: 0, PHONE_REVEAL: 0, WHATSAPP_CLICK: 0 });

/** Event totals per listing for the owner, optionally since a date. */
export async function eventCountsByListing(ownerId: string, since?: Date) {
  const rows = await db.listingEvent.groupBy({
    by: ["listingId", "type"],
    where: { listing: { ownerId }, ...(since ? { createdAt: { gte: since } } : {}) },
    _count: { _all: true },
  });
  const out = new Map<string, Counts>();
  for (const r of rows) {
    const e = out.get(r.listingId) ?? zero();
    e[r.type] = r._count._all;
    out.set(r.listingId, e);
  }
  return out;
}

/** Real inquiries (contact requests) per listing, optionally since a date. */
export async function inquiryCountsByListing(ownerId: string, since?: Date) {
  const rows = await db.contactRequest.groupBy({
    by: ["listingId"],
    where: { recipientId: ownerId, listingId: { not: null }, ...(since ? { createdAt: { gte: since } } : {}) },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.listingId!, r._count._all]));
}

export async function statistics(ownerId: string, locale: AppLocale, days: Range) {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const [series, events, inquiries, listings] = await Promise.all([
    dailyEvents(ownerId, days),
    eventCountsByListing(ownerId, since),
    inquiryCountsByListing(ownerId, since),
    db.listing.findMany({
      where: { ownerId, status: { not: "DRAFT" } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, status: true, expiresAt: true, translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } } },
    }),
  ]);
  const totals = zero();
  for (const c of events.values()) for (const k of Object.keys(totals) as ListingEventType[]) totals[k] += c[k];
  const inquiryTotal = [...inquiries.values()].reduce((a, b) => a + b, 0);
  const now = new Date();
  const rows = listings
    .map((l) => {
      const c = events.get(l.id) ?? zero();
      const inq = inquiries.get(l.id) ?? 0;
      return {
        id: l.id,
        title: pickTranslation(l.translations, locale)?.title ?? "—",
        status: ownerStatusOf(l, now),
        ...c,
        inquiries: inq,
        // Shown only with enough views for the ratio to mean something.
        conversion: c.VIEW >= MIN_VIEWS_FOR_RATE ? inq / c.VIEW : null,
        ctr: c.IMPRESSION >= MIN_IMPRESSIONS_FOR_RATE ? c.VIEW / c.IMPRESSION : null,
      };
    })
    .sort((a, b) => b.VIEW - a.VIEW || b.inquiries - a.inquiries);
  return {
    series,
    totals: { ...totals, inquiries: inquiryTotal },
    conversion: totals.VIEW >= MIN_VIEWS_FOR_RATE ? inquiryTotal / totals.VIEW : null,
    ctr: totals.IMPRESSION >= MIN_IMPRESSIONS_FOR_RATE ? totals.VIEW / totals.IMPRESSION : null,
    rows,
  };
}

export const MIN_VIEWS_FOR_RATE = 20;
export const MIN_IMPRESSIONS_FOR_RATE = 50;

// ───────────── listings table ─────────────

export const LISTING_SORT_KEYS = ["updated", "created", "price_desc", "price_asc", "views", "expires"] as const;
export type ListingSortKey = (typeof LISTING_SORT_KEYS)[number];
export const LISTINGS_PER_PAGE = 12;

const listingFilterSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(OWNER_STATUSES).catch("ALL"),
  category: z.enum(LISTING_CATEGORIES).optional().catch(undefined),
  sort: z.enum(LISTING_SORT_KEYS).catch("updated"),
  view: z.enum(["cards", "table"]).catch("cards"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});
export type ListingFilter = z.infer<typeof listingFilterSchema>;
export const parseListingFilter = (sp: Record<string, string | string[] | undefined>) =>
  listingFilterSchema.parse(Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));

export async function ownerListings(ownerId: string, locale: AppLocale, f: ListingFilter) {
  const now = new Date();
  const where: Prisma.ListingWhereInput = {
    ownerId,
    ...statusWhere(f.status, now),
    ...(f.category ? { category: f.category as ListingCategory } : {}),
    ...(f.q ? { OR: [{ id: f.q }, { translations: { some: { title: { contains: f.q, mode: "insensitive" } } } }, { addressPublic: { contains: f.q, mode: "insensitive" } }] } : {}),
  };
  const select = {
    id: true,
    category: true,
    status: true,
    monthlyRent: true,
    pricePerPlace: true,
    rooms: true,
    availableSpaces: true,
    rejectionReason: true,
    createdAt: true,
    updatedAt: true,
    expiresAt: true,
    isVerified: true,
    district: { select: { nameAz: true, nameTr: true, nameRu: true, nameEn: true } },
    neighborhood: { select: { nameAz: true, nameTr: true, nameRu: true, nameEn: true } },
    translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } },
    images: { take: 1, orderBy: { position: "asc" as const }, select: { url: true } },
    featured: { where: { endsAt: { gt: now } }, select: { endsAt: true }, take: 1 },
    _count: { select: { images: true } },
  } satisfies Prisma.ListingSelect;

  const [total, counts, statusCounts] = await Promise.all([
    db.listing.count({ where }),
    Promise.all([eventCountsByListing(ownerId), inquiryCountsByListing(ownerId)]),
    ownerStatusCounts(ownerId),
  ]);
  const [events, inquiries] = counts;
  const pageCount = Math.max(1, Math.ceil(total / LISTINGS_PER_PAGE));
  const page = Math.min(f.page, pageCount);
  const skip = (page - 1) * LISTINGS_PER_PAGE;

  let rows;
  if (f.sort === "views") {
    // Views live in another table: order the owner's ids in memory, then load one page.
    const ids = await db.listing.findMany({ where, select: { id: true } });
    const ordered = ids.map((r) => r.id).sort((a, b) => (events.get(b)?.VIEW ?? 0) - (events.get(a)?.VIEW ?? 0));
    const pageIds = ordered.slice(skip, skip + LISTINGS_PER_PAGE);
    const found = await db.listing.findMany({ where: { id: { in: pageIds } }, select });
    rows = pageIds.map((id) => found.find((r) => r.id === id)!).filter(Boolean);
  } else {
    const orderBy: Prisma.ListingOrderByWithRelationInput =
      f.sort === "created"
        ? { createdAt: "desc" }
        : f.sort === "price_desc"
          ? { monthlyRent: "desc" }
          : f.sort === "price_asc"
            ? { monthlyRent: "asc" }
            : f.sort === "expires"
              ? { expiresAt: { sort: "asc", nulls: "last" } }
              : { updatedAt: "desc" };
    rows = await db.listing.findMany({ where, orderBy: [orderBy, { id: "asc" }], skip, take: LISTINGS_PER_PAGE, select });
  }

  return {
    page,
    pageCount,
    total,
    statusCounts,
    items: rows.map((l) => ({
      id: l.id,
      title: pickTranslation(l.translations, locale)?.title ?? "—",
      category: l.category,
      status: ownerStatusOf(l, now),
      monthlyRent: l.monthlyRent,
      pricePerPlace: l.pricePerPlace,
      rooms: l.rooms,
      availableSpaces: l.availableSpaces,
      rejectionReason: l.rejectionReason,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      expiresAt: l.expiresAt,
      isVerified: l.isVerified,
      district: l.district,
      neighborhood: l.neighborhood,
      image: l.images[0]?.url ?? null,
      imageCount: l._count.images,
      featuredUntil: l.featured[0]?.endsAt ?? null,
      views: events.get(l.id)?.VIEW ?? 0,
      inquiries: inquiries.get(l.id) ?? 0,
    })),
  };
}

export async function ownerStatusCounts(ownerId: string) {
  const now = new Date();
  const [byStatus, expired] = await Promise.all([
    db.listing.groupBy({ by: ["status"], where: { ownerId }, _count: { _all: true } }),
    db.listing.count({ where: { ownerId, ...statusWhere("EXPIRED", now) } }),
  ]);
  const c = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  return {
    ALL: byStatus.reduce((n, r) => n + r._count._all, 0),
    DRAFT: c("DRAFT"),
    PENDING_REVIEW: c("PENDING_REVIEW"),
    ACTIVE: c("PUBLISHED") - expired,
    EXPIRED: expired,
    REJECTED: c("REJECTED"),
    RENTED: c("RENTED"),
    ARCHIVED: c("ARCHIVED"),
  } satisfies Record<OwnerStatus, number>;
}

// ───────────── bulk actions ─────────────

export const BULK_OPS = { submit: submitListing, rented: markRented, archive: archiveListing, renew: renewListing, delete: deleteListing } as const;
export type BulkOp = keyof typeof BULK_OPS;

/**
 * Applies one status change to many listings. Each id goes through the same
 * service call as a single action, so ownership and status rules are checked
 * per listing; failures are reported, never silently skipped.
 */
export async function bulkListingOp(actor: Actor, op: BulkOp, ids: string[]) {
  const fn = BULK_OPS[op];
  if (!fn) throw new ServiceError("validation");
  const unique = [...new Set(ids.filter((id) => /^[a-z0-9]{10,40}$/.test(id)))].slice(0, 100);
  if (!unique.length) throw new ServiceError("validation");
  if (!(await rateLimit(`bulk:${actor.id}`, 30, 3_600_000))) throw new ServiceError("rate_limited");
  let ok = 0;
  const failed: { id: string; code: string }[] = [];
  for (const id of unique) {
    try {
      await fn(actor, id);
      ok++;
    } catch (err) {
      failed.push({ id, code: err instanceof ServiceError ? err.code : "generic" });
    }
  }
  return { ok, failed };
}

// ───────────── inquiries / leads ─────────────

export const LEAD_STATUSES = ["NEW", "CONTACTED", "VIEWING_SCHEDULED", "COMPLETED", "CLOSED"] as const;
export const INQUIRIES_PER_PAGE = 15;

const leadFilterSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  lead: z.enum(["ALL", ...LEAD_STATUSES]).catch("ALL"),
  listing: z.string().regex(/^[a-z0-9]{10,40}$/).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});
export type LeadFilter = z.infer<typeof leadFilterSchema>;
export const parseLeadFilter = (sp: Record<string, string | string[] | undefined>) =>
  leadFilterSchema.parse(Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));

/**
 * Inquiries received about the owner's listings. Sender contact details are
 * attached only after the owner has accepted the request (the existing
 * privacy rule); the name and message are always visible to the recipient.
 */
export async function ownerInquiries(ownerId: string, locale: AppLocale, f: LeadFilter) {
  const where: Prisma.ContactRequestWhereInput = {
    recipientId: ownerId,
    listingId: f.listing ?? { not: null },
    ...(f.lead !== "ALL" ? { leadStatus: f.lead } : {}),
    ...(f.q
      ? {
          OR: [
            { message: { contains: f.q, mode: "insensitive" } },
            { ownerNote: { contains: f.q, mode: "insensitive" } },
            { sender: { name: { contains: f.q, mode: "insensitive" } } },
            { listing: { translations: { some: { title: { contains: f.q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const [total, byLead, rows, listingOptions] = await Promise.all([
    db.contactRequest.count({ where }),
    db.contactRequest.groupBy({ by: ["leadStatus"], where: { recipientId: ownerId, listingId: f.listing ?? { not: null } }, _count: { _all: true } }),
    db.contactRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (f.page - 1) * INQUIRIES_PER_PAGE,
      take: INQUIRIES_PER_PAGE,
      select: {
        id: true,
        message: true,
        status: true,
        leadStatus: true,
        ownerNote: true,
        viewingAt: true,
        createdAt: true,
        readAt: true,
        leadUpdatedAt: true,
        sender: { select: { name: true, email: true, phone: true, role: true, profile: { select: { sharePhoneOnAccept: true } }, agentProfile: { select: { businessPhone: true } } } },
        listing: {
          select: {
            id: true,
            images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
            translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } },
          },
        },
      },
    }),
    db.listing.findMany({
      where: { ownerId, contactRequests: { some: {} } },
      select: { id: true, translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);
  const leadCounts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, byLead.find((r) => r.leadStatus === s)?._count._all ?? 0])) as Record<LeadStatus, number>;
  return {
    total,
    page: f.page,
    pageCount: Math.max(1, Math.ceil(total / INQUIRIES_PER_PAGE)),
    leadCounts,
    listingOptions: listingOptions.map((l) => ({ id: l.id, title: pickTranslation(l.translations, locale)?.title ?? "—" })),
    items: rows.map((r) => {
      const accepted = r.status === "ACCEPTED";
      const s = r.sender;
      const phone = s.role === "AGENT" ? (s.agentProfile?.businessPhone ?? s.phone) : s.profile?.sharePhoneOnAccept !== false ? s.phone : null;
      return {
        id: r.id,
        message: r.message,
        status: r.status,
        leadStatus: r.leadStatus,
        ownerNote: r.ownerNote,
        viewingAt: r.viewingAt,
        createdAt: r.createdAt,
        unread: !r.readAt,
        name: s.name,
        contact: accepted ? { email: s.email, phone } : null,
        listing: r.listing ? { id: r.listing.id, image: r.listing.images[0]?.url ?? null, title: pickTranslation(r.listing.translations, locale)?.title ?? "—" } : null,
      };
    }),
  };
}

const leadUpdateSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{10,40}$/),
  leadStatus: z.enum(LEAD_STATUSES),
  ownerNote: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(2000, { error: "tooLong" })).optional(),
  viewingAt: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v : undefined),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: "date" }).optional(),
  ),
});

/** Only the recipient may change the pipeline stage, note or viewing time of an inquiry. */
export async function updateLead(userId: string, raw: Record<string, unknown>) {
  const parsed = leadUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "_form")] = issue.message === "tooLong" ? "tooLong" : issue.path[0] === "viewingAt" ? "date" : "choice";
    throw new ServiceError("validation", errors);
  }
  const v = parsed.data;
  const req = await db.contactRequest.findUnique({ where: { id: v.id }, select: { recipientId: true } });
  if (!req || req.recipientId !== userId) throw new ServiceError("not_found");
  if (v.leadStatus === "VIEWING_SCHEDULED" && !v.viewingAt) throw new ServiceError("validation", { viewingAt: "required" });
  if (!(await rateLimit(`lead:${userId}`, 300, 3_600_000))) throw new ServiceError("rate_limited");
  await db.contactRequest.update({
    where: { id: v.id },
    data: {
      leadStatus: v.leadStatus,
      ownerNote: v.ownerNote ? v.ownerNote : null,
      // Stored as the wall-clock time the owner typed (Baku, UTC+4).
      viewingAt: v.viewingAt ? new Date(`${v.viewingAt}:00+04:00`) : null,
      leadUpdatedAt: new Date(),
      readAt: new Date(),
    },
  });
}
