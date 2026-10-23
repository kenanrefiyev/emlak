import "server-only";
import { db } from "@/server/db";
import { buildListingWhere } from "@/server/listings/queries";
import { parseListingFilters } from "@/lib/search/listing-filters";
import { UNIVERSITY_RADIUS_KM, distanceKm, ownAreaPosition, universityPosition } from "@/lib/baku-geo";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

/**
 * In-app notifications only — there is no push or extra email channel. Each
 * trigger carries a dedupe key, so a repeated trigger (a re-approval, a retry)
 * never creates a second row for the same event.
 */
export async function notify(userId: string, type: NotificationType, href: string, dedupeKey: string, data?: Prisma.InputJsonValue) {
  await db.notification.createMany({ data: [{ userId, type, href, dedupeKey, data }], skipDuplicates: true });
}

export async function unreadNotificationCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function notificationsFor(userId: string, take = 50) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function markNotificationsRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

/** Unread search alerts above which no more are added, so a burst of new listings cannot flood anyone. */
const MAX_UNREAD_SEARCH_ALERTS = 10;

/**
 * Tells users whose saved listing searches match a newly published listing.
 * One notification per user and listing, however many of their searches
 * match; the listing owner is never notified about their own listing.
 * Searches are re-parsed exactly as /students would parse them.
 */
export async function notifySearchMatches(listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      ownerId: true,
      metroStation: { select: { slug: true, latitude: true, longitude: true } },
      neighborhood: { select: { slug: true, latitude: true, longitude: true } },
      translations: { select: { locale: true, title: true, isOriginal: true } },
    },
  });
  if (!listing) return 0;
  const searches = await db.savedSearch.findMany({
    where: { kind: "LISTINGS", userId: { not: listing.ownerId }, user: { status: "ACTIVE" } },
    select: { id: true, userId: true, name: true, query: true },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });
  const at = ownAreaPosition(listing);
  // Titles in every language the listing has, so each reader sees their own.
  const titles = Object.fromEntries(listing.translations.map((t) => [t.isOriginal ? `${t.locale}*` : t.locale, t.title]));
  const unis = new Map<string, ReturnType<typeof universityPosition>>();
  const notified = new Set<string>();
  for (const s of searches) {
    if (notified.has(s.userId)) continue;
    const f = parseListingFilters(new URLSearchParams(s.query), "students");
    const hit = await db.listing.count({ where: { AND: [buildListingWhere(f, "students"), { id: listingId }] } });
    if (!hit) continue;
    if (f.university) {
      if (!unis.has(f.university)) {
        const u = await db.university.findUnique({ where: { slug: f.university }, select: { slug: true, latitude: true, longitude: true } });
        unis.set(f.university, u ? universityPosition(u) : null);
      }
      const c = unis.get(f.university);
      if (!c || !at || distanceKm(c, at) > UNIVERSITY_RADIUS_KM) continue;
    }
    const unread = await db.notification.count({ where: { userId: s.userId, type: "SEARCH_MATCH", readAt: null } });
    if (unread >= MAX_UNREAD_SEARCH_ALERTS) continue;
    await notify(s.userId, "SEARCH_MATCH", `/listings/${listingId}`, `match:${listingId}`, { search: s.name, titles });
    notified.add(s.userId);
  }
  return notified.size;
}
