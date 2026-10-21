import "server-only";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { audit } from "@/server/audit";
import { getSettings } from "@/server/settings";
import { storage } from "@/server/storage/driver";
import { objectKey, processImage } from "@/server/storage/images";
import { MAX_IMAGES } from "@/lib/domain";
import { universityNearness } from "@/lib/baku-geo";
import { listingInputSchema, normalizeListingInput, type ListingInput } from "@/lib/validation/listing";
import { fieldErrorsOf } from "@/lib/validation/helpers";
import type { Locale, Prisma, Role } from "@/generated/prisma/client";

export interface Actor {
  id: string;
  role: Role;
}

const ACTIVE_STATUSES = ["PENDING_REVIEW", "PUBLISHED"] as const;

export function parseListingInput(raw: Record<string, unknown>): ListingInput {
  const parsed = listingInputSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  return parsed.data;
}

async function loadOwned(actor: Actor, id: string) {
  const listing = await db.listing.findUnique({
    where: { id },
    select: { id: true, ownerId: true, status: true, expiresAt: true, originalLocale: true, publishedAt: true, _count: { select: { images: true } } },
  });
  if (!listing) throw new ServiceError("not_found");
  if (listing.ownerId !== actor.id && actor.role !== "ADMIN") throw new ServiceError("forbidden");
  return listing;
}

/** How many listings may be live (pending + published) at once for this user. */
export async function listingQuota(actor: Actor): Promise<number> {
  if (actor.role === "ADMIN") return Number.POSITIVE_INFINITY;
  const settings = await getSettings();
  if (actor.role === "AGENT") {
    const sub = await db.subscription.findFirst({
      where: { userId: actor.id, status: "ACTIVE", endsAt: { gt: new Date() } },
      include: { package: true },
      orderBy: { endsAt: "desc" },
    });
    return sub ? sub.package.listingLimit : settings.agentFreeListingLimit;
  }
  return settings.userListingLimit;
}

async function assertQuota(actor: Actor, excludeId?: string) {
  const [quota, used] = await Promise.all([
    listingQuota(actor),
    db.listing.count({
      where: { ownerId: actor.id, status: { in: [...ACTIVE_STATUSES] }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    }),
  ]);
  if (used >= quota) throw new ServiceError("quota");
}

/**
 * Only real ids from the reference tables are accepted; a neighborhood must
 * belong to the district, and a tagged university must really be nearby.
 */
const place = { slug: true, latitude: true, longitude: true } as const;

async function assertReferences(v: ReturnType<typeof normalizeListingInput>, amenityIds: string[]) {
  const [district, neighborhood, metro, university, amenities] = await Promise.all([
    db.district.findUnique({ where: { id: v.districtId }, select: { id: true } }),
    v.neighborhoodId ? db.neighborhood.findUnique({ where: { id: v.neighborhoodId }, select: { districtId: true, ...place } }) : null,
    v.metroStationId ? db.metroStation.findUnique({ where: { id: v.metroStationId }, select: place }) : null,
    v.universityId ? db.university.findUnique({ where: { id: v.universityId }, select: { districtId: true, ...place } }) : null,
    amenityIds.length ? db.amenity.count({ where: { id: { in: amenityIds } } }) : 0,
  ]);
  const errors: Record<string, string> = {};
  if (!district) errors.districtId = "choice";
  if (v.neighborhoodId && (!neighborhood || neighborhood.districtId !== v.districtId)) errors.neighborhoodId = "choice";
  if (v.metroStationId && !metro) errors.metroStationId = "choice";
  if (v.universityId && !university) errors.universityId = "choice";
  else if (university && !errors.neighborhoodId && !universityNearness({ districtId: v.districtId, metroStation: metro, neighborhood }, university))
    errors.universityId = "uniTooFar";
  if (amenities !== new Set(amenityIds).size) errors.amenityIds = "choice";
  if (Object.keys(errors).length) throw new ServiceError("validation", errors);
}

export async function createListing(actor: Actor, input: ListingInput) {
  const data = normalizeListingInput(input);
  const amenityIds = [...new Set(input.amenityIds)];
  await assertReferences(data, amenityIds);
  const draftCount = await db.listing.count({ where: { ownerId: actor.id, status: "DRAFT" } });
  if (draftCount >= 10) throw new ServiceError("too_many_drafts");

  const listing = await db.listing.create({
    data: {
      ...data,
      ownerId: actor.id,
      status: "DRAFT",
      translations: {
        create: {
          locale: data.originalLocale,
          title: input.title,
          description: input.description,
          paymentTerms: input.paymentTerms ?? null,
          rules: input.rules ?? null,
          isOriginal: true,
        },
      },
      amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
    },
    select: { id: true },
  });
  return listing;
}

export async function updateListing(actor: Actor, id: string, input: ListingInput) {
  const current = await loadOwned(actor, id);
  const data = normalizeListingInput(input);
  const amenityIds = [...new Set(input.amenityIds)];
  await assertReferences(data, amenityIds);

  // Edits to live or rejected listings go back to moderation; an admin edit does not.
  const requeue = actor.role !== "ADMIN" && (current.status === "PUBLISHED" || current.status === "REJECTED");

  await db.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id },
      data: {
        ...data,
        ...(requeue ? { status: "PENDING_REVIEW", submittedAt: new Date(), rejectionReason: null } : {}),
      },
    });
    if (current.originalLocale !== data.originalLocale) {
      await tx.listingTranslation.updateMany({ where: { listingId: id }, data: { isOriginal: false } });
      // A translation that already exists in the new original language is replaced.
      await tx.listingTranslation.deleteMany({ where: { listingId: id, locale: data.originalLocale } });
      await tx.listingTranslation.deleteMany({ where: { listingId: id, locale: current.originalLocale } });
    }
    await tx.listingTranslation.upsert({
      where: { listingId_locale: { listingId: id, locale: data.originalLocale } },
      create: {
        listingId: id,
        locale: data.originalLocale,
        title: input.title,
        description: input.description,
        paymentTerms: input.paymentTerms ?? null,
        rules: input.rules ?? null,
        isOriginal: true,
      },
      update: { title: input.title, description: input.description, paymentTerms: input.paymentTerms ?? null, rules: input.rules ?? null, isOriginal: true, isMachine: false },
    });
    await tx.listingAmenity.deleteMany({ where: { listingId: id } });
    if (amenityIds.length) await tx.listingAmenity.createMany({ data: amenityIds.map((amenityId) => ({ listingId: id, amenityId })) });
    if (actor.role === "ADMIN" && current.ownerId !== actor.id) await audit(actor.id, "listing.edit", "listing", id, undefined, tx);
  });
  return { requeued: requeue };
}

/** Owner-written translations in other languages. Empty title+description removes it. */
export async function saveTranslation(
  actor: Actor,
  id: string,
  locale: Locale,
  input: { title?: string; description?: string; paymentTerms?: string },
) {
  const listing = await loadOwned(actor, id);
  if (locale === listing.originalLocale) throw new ServiceError("validation", { locale: "choice" });
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  if (!title && !description) {
    await db.listingTranslation.deleteMany({ where: { listingId: id, locale } });
    return;
  }
  const errors: Record<string, string> = {};
  if (title.length < 10) errors.title = title ? "tooShort" : "required";
  if (title.length > 120) errors.title = "tooLong";
  if (description.length < 40) errors.description = description ? "tooShort" : "required";
  if (description.length > 5000) errors.description = "tooLong";
  if (Object.keys(errors).length) throw new ServiceError("validation", errors);
  const paymentTerms = input.paymentTerms?.trim().slice(0, 500) || null;
  await db.listingTranslation.upsert({
    where: { listingId_locale: { listingId: id, locale } },
    create: { listingId: id, locale, title, description, paymentTerms, isOriginal: false, isMachine: false },
    update: { title, description, paymentTerms, isMachine: false },
  });
}

export async function submitListing(actor: Actor, id: string) {
  const listing = await loadOwned(actor, id);
  if (!["DRAFT", "REJECTED"].includes(listing.status)) throw new ServiceError("bad_status");
  if (listing._count.images === 0) throw new ServiceError("needs_image");
  await assertQuota(actor, id);
  await db.listing.update({
    where: { id },
    data: { status: "PENDING_REVIEW", submittedAt: new Date(), rejectionReason: null },
  });
}

export async function markRented(actor: Actor, id: string) {
  const listing = await loadOwned(actor, id);
  if (listing.status !== "PUBLISHED") throw new ServiceError("bad_status");
  await db.listing.update({ where: { id }, data: { status: "RENTED", rentedAt: new Date() } });
  await db.featuredListing.updateMany({ where: { listingId: id, endsAt: { gt: new Date() } }, data: { endsAt: new Date() } });
}

export async function archiveListing(actor: Actor, id: string) {
  const listing = await loadOwned(actor, id);
  if (listing.status === "ARCHIVED") return;
  await db.listing.update({ where: { id }, data: { status: "ARCHIVED" } });
  await db.featuredListing.updateMany({ where: { listingId: id, endsAt: { gt: new Date() } }, data: { endsAt: new Date() } });
}

/**
 * Renewal: a live listing gets a fresh expiry; an expired, rented or archived
 * one goes back to moderation so stale inventory is checked before reappearing.
 */
export async function renewListing(actor: Actor, id: string) {
  const listing = await loadOwned(actor, id);
  const settings = await getSettings();
  const now = new Date();
  const live = listing.status === "PUBLISHED" && listing.expiresAt && listing.expiresAt > now;
  if (live) {
    await db.listing.update({ where: { id }, data: { expiresAt: new Date(now.getTime() + settings.listingTtlDays * 86_400_000) } });
    return { requeued: false };
  }
  if (!["PUBLISHED", "RENTED", "ARCHIVED"].includes(listing.status)) throw new ServiceError("bad_status");
  if (listing._count.images === 0) throw new ServiceError("needs_image");
  await assertQuota(actor, id);
  await db.listing.update({
    where: { id },
    data: { status: "PENDING_REVIEW", submittedAt: now, rentedAt: null, rejectionReason: null },
  });
  return { requeued: true };
}

export async function deleteListing(actor: Actor, id: string) {
  await loadOwned(actor, id);
  const images = await db.listingImage.findMany({ where: { listingId: id }, select: { storageKey: true, url: true } });
  await db.listing.delete({ where: { id } });
  await removeObjects(images.map((i) => ({ key: i.storageKey, url: i.url })));
  if (actor.role === "ADMIN") await audit(actor.id, "listing.delete", "listing", id);
}

async function removeObjects(objects: { key: string; url: string }[]) {
  const driver = storage();
  await Promise.allSettled(objects.map((o) => driver.remove(o)));
}

// ───────────── images ─────────────

export async function addListingImage(actor: Actor, listingId: string, file: { buffer: Buffer; type: string }) {
  await loadOwned(actor, listingId);
  const count = await db.listingImage.count({ where: { listingId } });
  if (count >= MAX_IMAGES) throw new ServiceError("too_many_images");
  const processed = await processImage(file.buffer, file.type);
  const key = objectKey("listings", listingId);
  const stored = await storage().put(key, processed.buffer, processed.mimeType);
  try {
    return await db.listingImage.create({
      data: {
        listingId,
        storageKey: stored.key,
        url: stored.url,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.buffer.byteLength,
        mimeType: processed.mimeType,
        position: count,
      },
      select: { id: true, url: true, width: true, height: true, position: true },
    });
  } catch (err) {
    await removeObjects([stored]); // never leave an orphaned file behind
    throw err;
  }
}

export async function removeListingImage(actor: Actor, listingId: string, imageId: string) {
  const listing = await loadOwned(actor, listingId);
  const image = await db.listingImage.findFirst({ where: { id: imageId, listingId } });
  if (!image) throw new ServiceError("not_found");
  if (listing.status === "PUBLISHED" && listing._count.images <= 1) throw new ServiceError("needs_image");
  await db.$transaction(async (tx) => {
    await tx.listingImage.delete({ where: { id: imageId } });
    const rest = await tx.listingImage.findMany({ where: { listingId }, orderBy: { position: "asc" }, select: { id: true } });
    for (const [i, img] of rest.entries()) await tx.listingImage.update({ where: { id: img.id }, data: { position: i } });
  });
  await removeObjects([{ key: image.storageKey, url: image.url }]);
}

export async function reorderListingImages(actor: Actor, listingId: string, orderedIds: string[]) {
  await loadOwned(actor, listingId);
  const images = await db.listingImage.findMany({ where: { listingId }, select: { id: true } });
  const known = new Set(images.map((i) => i.id));
  if (orderedIds.length !== known.size || !orderedIds.every((id) => known.has(id))) throw new ServiceError("validation");
  await db.$transaction(orderedIds.map((id, position) => db.listingImage.update({ where: { id }, data: { position } })));
}

// ───────────── moderation (admin) ─────────────

export async function moderateListing(admin: Actor, id: string, decision: "approve" | "reject", reason?: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  const listing = await db.listing.findUnique({ where: { id }, select: { status: true, publishedAt: true } });
  if (!listing) throw new ServiceError("not_found");
  const settings = await getSettings();
  const now = new Date();
  await db.$transaction(async (tx) => {
    if (decision === "approve") {
      await tx.listing.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          rejectionReason: null,
          publishedAt: listing.publishedAt ?? now,
          expiresAt: new Date(now.getTime() + settings.listingTtlDays * 86_400_000),
        },
      });
    } else {
      const text = reason?.trim();
      if (!text) throw new ServiceError("validation", { reason: "required" });
      await tx.listing.update({ where: { id }, data: { status: "REJECTED", rejectionReason: text.slice(0, 500) } });
    }
    await audit(admin.id, `listing.${decision}`, "listing", id, { from: listing.status, reason: reason ?? null }, tx);
  });
}

export async function setListingVerified(admin: Actor, id: string, verified: boolean) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  await db.listing.update({ where: { id }, data: { isVerified: verified, verifiedAt: verified ? new Date() : null } });
  await audit(admin.id, verified ? "listing.verify" : "listing.unverify", "listing", id);
}

export async function adminSetListingStatus(admin: Actor, id: string, status: "ARCHIVED" | "RENTED") {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  await db.listing.update({ where: { id }, data: { status, ...(status === "RENTED" ? { rentedAt: new Date() } : {}) } });
  await audit(admin.id, `listing.${status.toLowerCase()}`, "listing", id);
}

export type ListingEventKind = "VIEW" | "IMPRESSION" | "SAVE" | "CONTACT_REQUEST" | "PHONE_REVEAL" | "WHATSAPP_CLICK";

export async function recordListingEvent(listingId: string, type: ListingEventKind, userId?: string | null) {
  await db.listingEvent.create({ data: { listingId, type, userId: userId ?? null } }).catch(() => undefined);
}

export type ListingUpdateData = Prisma.ListingUpdateInput;
