import "server-only";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { sendMail, appUrl } from "@/server/mail";
import { audit } from "@/server/audit";
import { contactRequestSchema, reportSchema, savedSearchSchema, supportSchema } from "@/lib/validation/misc";
import { fieldErrorsOf } from "@/lib/validation/helpers";
import { publicListingWhere } from "@/server/listings/queries";
import { publicRoommateWhere } from "@/server/roommates/queries";
import { recordListingEvent, type Actor } from "@/server/listings/service";
import type { AppLocale } from "@/i18n/routing";

const HOUR = 3_600_000;

// ───────────── saved listings ─────────────

export async function setSaved(userId: string, listingId: string, saved: boolean) {
  if (saved) {
    const listing = await db.listing.findFirst({ where: { id: listingId, ...publicListingWhere() }, select: { id: true } });
    if (!listing) throw new ServiceError("not_found");
    const created = await db.savedListing.createMany({ data: [{ userId, listingId }], skipDuplicates: true });
    if (created.count) await recordListingEvent(listingId, "SAVE", userId);
  } else {
    await db.savedListing.deleteMany({ where: { userId, listingId } });
  }
}

/** Saved listings the user can still open — the same set /account/saved shows. */
export async function savedCount(userId: string) {
  return db.savedListing.count({ where: { userId, listing: publicListingWhere() } });
}

export async function savedIdsFor(userId: string | undefined, listingIds: string[]): Promise<Set<string>> {
  if (!userId || !listingIds.length) return new Set();
  const rows = await db.savedListing.findMany({ where: { userId, listingId: { in: listingIds } }, select: { listingId: true } });
  return new Set(rows.map((r) => r.listingId));
}

// ───────────── contact requests ─────────────

export interface ContactCopy {
  subject: string;
  body: (senderFirstName: string, link: string) => string;
}

/**
 * A message to the owner of a public listing or roommate ad. One open request
 * per sender and target; 10 requests per hour per user. Contact details are
 * exchanged only after the recipient accepts.
 */
export async function createContactRequest(
  sender: Actor & { name: string },
  raw: Record<string, unknown>,
  ctx: { locale: AppLocale; copy: ContactCopy },
) {
  const parsed = contactRequestSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const { listingId, roommateAdId, message } = parsed.data;

  let recipientId: string;
  if (listingId) {
    const l = await db.listing.findFirst({ where: { id: listingId, ...publicListingWhere() }, select: { ownerId: true } });
    if (!l) throw new ServiceError("not_found");
    recipientId = l.ownerId;
  } else {
    const r = await db.roommateAd.findFirst({ where: { id: roommateAdId, ...publicRoommateWhere() }, select: { ownerId: true } });
    if (!r) throw new ServiceError("not_found");
    recipientId = r.ownerId;
  }
  if (recipientId === sender.id) throw new ServiceError("own_item");

  const existing = await db.contactRequest.findFirst({
    where: { senderId: sender.id, status: "PENDING", ...(listingId ? { listingId } : { roommateAdId }) },
    select: { id: true },
  });
  if (existing) throw new ServiceError("already_requested");
  if (!(await rateLimit(`contact:user:${sender.id}`, 10, HOUR))) throw new ServiceError("rate_limited");

  const request = await db.contactRequest.create({
    data: { senderId: sender.id, recipientId, listingId: listingId ?? null, roommateAdId: roommateAdId ?? null, message },
    select: { id: true, recipient: { select: { email: true, preferredLocale: true } } },
  });
  if (listingId) await recordListingEvent(listingId, "CONTACT_REQUEST", sender.id);
  const mail = await sendMail({
    to: request.recipient.email,
    subject: ctx.copy.subject,
    text: ctx.copy.body(sender.name.split(" ")[0] ?? sender.name, appUrl(`/${request.recipient.preferredLocale}/account/requests`)),
  }).catch(() => ({ delivered: false }));
  return { id: request.id, emailDelivered: mail.delivered };
}

export async function respondToContact(userId: string, requestId: string, accept: boolean) {
  const req = await db.contactRequest.findUnique({ where: { id: requestId }, select: { recipientId: true, status: true } });
  if (!req || req.recipientId !== userId) throw new ServiceError("not_found");
  if (req.status !== "PENDING") throw new ServiceError("bad_status");
  await db.contactRequest.update({
    where: { id: requestId },
    data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date(), readAt: new Date() },
  });
}

export async function markRequestsRead(userId: string) {
  await db.contactRequest.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } });
}

/** Requests in both directions; contact details are attached only to accepted ones. */
export async function contactRequestsFor(userId: string) {
  const include = {
    listing: { select: { id: true, contactPhone: true, translations: { where: { isOriginal: true }, select: { title: true } } } },
    roommateAd: { select: { id: true, title: true } },
  } as const;
  const userSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    profile: { select: { sharePhoneOnAccept: true } },
    agentProfile: { select: { businessPhone: true } },
  } as const;
  const [incoming, outgoing] = await Promise.all([
    db.contactRequest.findMany({
      where: { recipientId: userId },
      include: { ...include, sender: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.contactRequest.findMany({
      where: { senderId: userId },
      include: { ...include, recipient: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  type U = { name: string; email: string; phone: string | null; role: string; profile: { sharePhoneOnAccept: boolean } | null; agentProfile: { businessPhone: string | null } | null };
  const reveal = (u: U, accepted: boolean) =>
    accepted
      ? {
          email: u.email,
          phone: u.role === "AGENT" ? (u.agentProfile?.businessPhone ?? u.phone) : u.profile?.sharePhoneOnAccept !== false ? u.phone : null,
        }
      : null;
  return {
    incoming: incoming.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      readAt: r.readAt,
      other: { name: r.sender.name },
      contact: reveal(r.sender, r.status === "ACCEPTED"),
      target: r.listing
        ? { kind: "listing" as const, id: r.listing.id, title: r.listing.translations[0]?.title ?? "" }
        : r.roommateAd
          ? { kind: "roommate" as const, id: r.roommateAd.id, title: r.roommateAd.title }
          : null,
    })),
    outgoing: outgoing.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      readAt: r.readAt,
      other: { name: r.recipient.name },
      // The listing's own contact number (set by the owner) wins over the account phone.
      contact: (() => {
        const c = reveal(r.recipient, r.status === "ACCEPTED");
        return c && r.listing?.contactPhone ? { ...c, phone: r.listing.contactPhone } : c;
      })(),
      target: r.listing
        ? { kind: "listing" as const, id: r.listing.id, title: r.listing.translations[0]?.title ?? "" }
        : r.roommateAd
          ? { kind: "roommate" as const, id: r.roommateAd.id, title: r.roommateAd.title }
          : null,
    })),
  };
}

/** Agents publish a business phone; revealing it needs a signed-in user and is counted. */
export async function revealAgentPhone(viewerId: string, listingId: string) {
  if (!(await rateLimit(`phone:user:${viewerId}`, 30, HOUR))) throw new ServiceError("rate_limited");
  const listing = await db.listing.findFirst({
    where: { id: listingId, ...publicListingWhere() },
    select: { contactPhone: true, owner: { select: { role: true, phone: true, agentProfile: { select: { businessPhone: true } } } } },
  });
  if (!listing || listing.owner.role !== "AGENT") throw new ServiceError("not_found");
  const phone = listing.contactPhone ?? listing.owner.agentProfile?.businessPhone ?? listing.owner.phone;
  if (!phone) throw new ServiceError("not_found");
  await recordListingEvent(listingId, "PHONE_REVEAL", viewerId);
  return phone;
}

// ───────────── reports ─────────────

export async function createReport(reporterId: string, raw: Record<string, unknown>) {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const { listingId, roommateAdId, reason, details } = parsed.data;
  if (!(await rateLimit(`report:user:${reporterId}`, 5, HOUR))) throw new ServiceError("rate_limited");
  const target = listingId
    ? await db.listing.findUnique({ where: { id: listingId }, select: { ownerId: true } })
    : await db.roommateAd.findUnique({ where: { id: roommateAdId! }, select: { ownerId: true } });
  if (!target) throw new ServiceError("not_found");
  if (target.ownerId === reporterId) throw new ServiceError("own_item");
  const dupe = await db.report.findFirst({
    where: { reporterId, status: "OPEN", ...(listingId ? { listingId } : { roommateAdId }) },
    select: { id: true },
  });
  if (dupe) throw new ServiceError("already_reported");
  await db.report.create({
    data: {
      reporterId,
      targetType: listingId ? "LISTING" : "ROOMMATE_AD",
      listingId: listingId ?? null,
      roommateAdId: roommateAdId ?? null,
      reportedUserId: target.ownerId,
      reason,
      details: details ?? null,
    },
  });
}

export async function resolveReport(admin: Actor, reportId: string, status: "RESOLVED" | "DISMISSED", resolution: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  const text = resolution.trim();
  if (text.length < 3) throw new ServiceError("validation", { resolution: "required" });
  await db.report.update({
    where: { id: reportId },
    data: { status, resolution: text.slice(0, 1000), resolverId: admin.id, resolvedAt: new Date() },
  });
  await audit(admin.id, `report.${status.toLowerCase()}`, "report", reportId, { resolution: text.slice(0, 200) });
}

// ───────────── saved searches ─────────────

export async function createSavedSearch(userId: string, raw: Record<string, unknown>) {
  const parsed = savedSearchSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const count = await db.savedSearch.count({ where: { userId } });
  if (count >= 20) throw new ServiceError("quota");
  // Re-serialise through URLSearchParams so only a plain query string is stored.
  const query = new URLSearchParams(parsed.data.query.replace(/^\?/, "")).toString();
  await db.savedSearch.create({ data: { userId, kind: parsed.data.kind, name: parsed.data.name, query } });
}

export async function deleteSavedSearch(userId: string, id: string) {
  await db.savedSearch.deleteMany({ where: { id, userId } });
}

// ───────────── support form ─────────────

export async function createSupportMessage(raw: Record<string, unknown>, ctx: { ip: string; locale: AppLocale; userId?: string }) {
  const parsed = supportSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  if (!(await rateLimit(`support:ip:${ctx.ip}`, 5, HOUR))) throw new ServiceError("rate_limited");
  await db.supportMessage.create({ data: { ...parsed.data, locale: ctx.locale, userId: ctx.userId ?? null } });
}
