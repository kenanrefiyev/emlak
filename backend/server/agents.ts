import "server-only";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { audit } from "@/server/audit";
import { getSettings } from "@/server/settings";
import { agentProfileSchema, verificationRequestSchema } from "@/lib/validation/misc";
import { fieldErrorsOf } from "@/lib/validation/helpers";
import type { Actor } from "@/server/listings/service";

function assertAgent(actor: Actor) {
  if (actor.role !== "AGENT") throw new ServiceError("forbidden");
}

export async function updateAgentProfile(actor: Actor, raw: Record<string, unknown>) {
  assertAgent(actor);
  const parsed = agentProfileSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const v = parsed.data;
  const data = {
    companyName: v.companyName ?? null,
    licenseNumber: v.licenseNumber ?? null,
    businessPhone: v.businessPhone ?? null,
    businessEmail: v.businessEmail ?? null,
    website: v.website ?? null,
    about: v.about ?? null,
    officeAddress: v.officeAddress ?? null,
  };
  await db.agentProfile.upsert({ where: { userId: actor.id }, create: { userId: actor.id, ...data }, update: data });
}

/**
 * One open verification request at a time; a verified account cannot re-apply.
 * Agents are reviewed on their company details; landlords on documents they
 * describe (ownership / rental right) — a verified phone alone is never enough.
 */
export async function requestVerification(actor: Actor, raw: Record<string, unknown>) {
  const parsed = verificationRequestSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  if (actor.role !== "AGENT") return requestOwnerVerification(actor, parsed.data.message);
  const profile = await db.agentProfile.findUnique({ where: { userId: actor.id } });
  if (!profile?.companyName && !profile?.licenseNumber) throw new ServiceError("profile_incomplete");
  if (profile.verificationStatus === "VERIFIED") throw new ServiceError("already_verified");
  const open = await db.verificationRequest.findFirst({ where: { applicantId: actor.id, status: "PENDING" } });
  if (open) throw new ServiceError("already_requested");
  await db.$transaction([
    db.verificationRequest.create({ data: { applicantId: actor.id, message: parsed.data.message } }),
    db.agentProfile.update({ where: { userId: actor.id }, data: { verificationStatus: "PENDING" } }),
  ]);
}

async function requestOwnerVerification(actor: Actor, message: string) {
  if (actor.role === "ADMIN") throw new ServiceError("forbidden");
  const user = await db.user.findUnique({ where: { id: actor.id }, select: { phone: true, profile: { select: { verificationStatus: true } } } });
  if (!user?.phone) throw new ServiceError("phone_required");
  if (user.profile?.verificationStatus === "VERIFIED") throw new ServiceError("already_verified");
  const open = await db.verificationRequest.findFirst({ where: { applicantId: actor.id, status: "PENDING" } });
  if (open) throw new ServiceError("already_requested");
  await db.$transaction([
    db.verificationRequest.create({ data: { applicantId: actor.id, message } }),
    db.userProfile.upsert({ where: { userId: actor.id }, create: { userId: actor.id, verificationStatus: "PENDING" }, update: { verificationStatus: "PENDING" } }),
  ]);
}

export async function reviewVerification(admin: Actor, requestId: string, approve: boolean, note: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  const req = await db.verificationRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") throw new ServiceError("not_found");
  if (!approve && note.trim().length < 3) throw new ServiceError("validation", { note: "required" });
  await db.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id: requestId },
      data: { status: approve ? "APPROVED" : "REJECTED", reviewerId: admin.id, reviewNote: note.trim() || null, reviewedAt: new Date() },
    });
    const applicant = await tx.user.findUnique({ where: { id: req.applicantId }, select: { role: true } });
    const data = { verificationStatus: approve ? ("VERIFIED" as const) : ("REJECTED" as const), verifiedAt: approve ? new Date() : null };
    if (applicant?.role === "AGENT") {
      await tx.agentProfile.update({ where: { userId: req.applicantId }, data });
      await audit(admin.id, approve ? "agent.verify" : "agent.reject", "user", req.applicantId, { requestId }, tx);
    } else {
      await tx.userProfile.upsert({ where: { userId: req.applicantId }, create: { userId: req.applicantId, ...data }, update: data });
      await audit(admin.id, approve ? "owner.verify" : "owner.reject", "user", req.applicantId, { requestId }, tx);
    }
  });
}

export async function revokeAgentVerification(admin: Actor, userId: string, note: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  await db.agentProfile.update({ where: { userId }, data: { verificationStatus: "NONE", verifiedAt: null } });
  await audit(admin.id, "agent.revoke", "user", userId, { note });
}

// ───────────── subscriptions & featured ─────────────

export async function activeSubscription(userId: string) {
  return db.subscription.findFirst({
    where: { userId, status: "ACTIVE", endsAt: { gt: new Date() } },
    include: { package: true },
    orderBy: { endsAt: "desc" },
  });
}

/** Agent asks for a package; payment is confirmed offline and an admin activates it. */
export async function requestSubscription(actor: Actor, packageId: string) {
  assertAgent(actor);
  const pkg = await db.subscriptionPackage.findFirst({ where: { id: packageId, isActive: true } });
  if (!pkg) throw new ServiceError("not_found");
  const pending = await db.subscription.findFirst({ where: { userId: actor.id, status: "REQUESTED" } });
  if (pending) throw new ServiceError("already_requested");
  await db.subscription.create({ data: { userId: actor.id, packageId, status: "REQUESTED" } });
}

export async function cancelSubscriptionRequest(actor: Actor, subscriptionId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.userId !== actor.id || sub.status !== "REQUESTED") throw new ServiceError("not_found");
  await db.subscription.update({ where: { id: subscriptionId }, data: { status: "CANCELLED" } });
}

export async function adminSetSubscription(admin: Actor, subscriptionId: string, action: "activate" | "cancel", note?: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId }, include: { package: true } });
  if (!sub) throw new ServiceError("not_found");
  const now = new Date();
  if (action === "activate") {
    if (sub.status !== "REQUESTED") throw new ServiceError("bad_status");
    await db.$transaction(async (tx) => {
      // A new package replaces the previous active one.
      await tx.subscription.updateMany({ where: { userId: sub.userId, status: "ACTIVE" }, data: { status: "EXPIRED", endsAt: now } });
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: "ACTIVE", startsAt: now, endsAt: new Date(now.getTime() + sub.package.durationDays * 86_400_000), note: note ?? null },
      });
      await audit(admin.id, "subscription.activate", "subscription", subscriptionId, { userId: sub.userId, package: sub.package.code }, tx);
    });
  } else {
    await db.subscription.update({ where: { id: subscriptionId }, data: { status: "CANCELLED", endsAt: sub.status === "ACTIVE" ? now : sub.endsAt, note: note ?? null } });
    await audit(admin.id, "subscription.cancel", "subscription", subscriptionId, { userId: sub.userId });
  }
}

export async function featuredSlotsUsed(userId: string) {
  const now = new Date();
  return db.featuredListing.count({
    where: { source: "SUBSCRIPTION", startsAt: { lte: now }, endsAt: { gt: now }, listing: { ownerId: userId } },
  });
}

/** Uses one featured slot of the agent's active package on one of their published listings. */
export async function featureListing(actor: Actor, listingId: string) {
  assertAgent(actor);
  const now = new Date();
  const listing = await db.listing.findFirst({
    where: { id: listingId, ownerId: actor.id, status: "PUBLISHED", expiresAt: { gt: now } },
    select: { id: true, expiresAt: true, featured: { where: { endsAt: { gt: now } }, select: { id: true } } },
  });
  if (!listing) throw new ServiceError("not_found");
  if (listing.featured.length) throw new ServiceError("already_featured");
  const sub = await activeSubscription(actor.id);
  if (!sub) throw new ServiceError("no_subscription");
  if ((await featuredSlotsUsed(actor.id)) >= sub.package.featuredSlots) throw new ServiceError("no_slots");
  const settings = await getSettings();
  const end = Math.min(now.getTime() + settings.featuredDays * 86_400_000, sub.endsAt!.getTime(), listing.expiresAt!.getTime());
  await db.featuredListing.create({ data: { listingId, source: "SUBSCRIPTION", startsAt: now, endsAt: new Date(end), createdById: actor.id } });
}

export async function adminFeatureListing(admin: Actor, listingId: string, days: number) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new ServiceError("validation", { days: "max" });
  const now = new Date();
  const listing = await db.listing.findFirst({ where: { id: listingId, status: "PUBLISHED" }, select: { id: true } });
  if (!listing) throw new ServiceError("not_found");
  await db.featuredListing.create({
    data: { listingId, source: "ADMIN", startsAt: now, endsAt: new Date(now.getTime() + days * 86_400_000), createdById: admin.id },
  });
  await audit(admin.id, "featured.add", "listing", listingId, { days });
}

export async function endFeatured(admin: Actor, featuredId: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  await db.featuredListing.update({ where: { id: featuredId }, data: { endsAt: new Date() } });
  await audit(admin.id, "featured.end", "featured_listing", featuredId);
}

/** Per-listing counts of real events over the last N days. */
export async function listingAnalytics(ownerId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.listingEvent.groupBy({
    by: ["listingId", "type"],
    where: { createdAt: { gte: since }, listing: { ownerId } },
    _count: { _all: true },
  });
  const out = new Map<string, Record<"VIEW" | "IMPRESSION" | "SAVE" | "CONTACT_REQUEST" | "PHONE_REVEAL" | "WHATSAPP_CLICK", number>>();
  for (const r of rows) {
    const entry = out.get(r.listingId) ?? { VIEW: 0, IMPRESSION: 0, SAVE: 0, CONTACT_REQUEST: 0, PHONE_REVEAL: 0, WHATSAPP_CLICK: 0 };
    entry[r.type] = r._count._all;
    out.set(r.listingId, entry);
  }
  return out;
}
