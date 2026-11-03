import "server-only";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { audit } from "@/server/audit";
import { getSettings } from "@/server/settings";
import { roommateInputSchema, normalizeRoommateInput, type RoommateInput } from "@/lib/validation/roommate";
import { fieldErrorsOf, V } from "@/lib/validation/helpers";
import { PRICE_MAX, PRICE_MIN } from "@/lib/domain";
import { amountScale } from "@/lib/money";
import type { Actor } from "@/server/listings/service";

const MAX_ACTIVE_ADS = 3;

export function parseRoommateInput(raw: Record<string, unknown>): RoommateInput {
  const parsed = roommateInputSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  return parsed.data;
}

async function loadOwned(actor: Actor, id: string) {
  const ad = await db.roommateAd.findUnique({ where: { id }, select: { id: true, ownerId: true, status: true, expiresAt: true } });
  if (!ad) throw new ServiceError("not_found");
  if (ad.ownerId !== actor.id && actor.role !== "ADMIN") throw new ServiceError("forbidden");
  return ad;
}

/**
 * Checks the ad's city (an active market's) and that every referenced place
 * exists and lies in that city, then checks the amounts against the currency
 * they are in — the city's country's — which it returns.
 */
async function assertReferences(v: ReturnType<typeof normalizeRoommateInput>, preferred: string[]): Promise<string> {
  const errors: Record<string, string> = {};
  const [city, district, neighborhood, metro, university, prefs] = await Promise.all([
    db.city.findFirst({ where: { id: v.cityId, country: { isActive: true } }, select: { country: { select: { currency: true } } } }),
    v.districtId ? db.district.findUnique({ where: { id: v.districtId }, select: { cityId: true } }) : null,
    v.neighborhoodId ? db.neighborhood.findUnique({ where: { id: v.neighborhoodId }, select: { districtId: true } }) : null,
    v.metroStationId ? db.metroStation.findUnique({ where: { id: v.metroStationId }, select: { cityId: true } }) : null,
    v.universityId ? db.university.findUnique({ where: { id: v.universityId }, select: { cityId: true } }) : null,
    preferred.length ? db.district.findMany({ where: { id: { in: preferred } }, select: { cityId: true } }) : [],
  ]);
  if (!city) errors.cityId = "choice";
  if (v.districtId && district?.cityId !== v.cityId) errors.districtId = "choice";
  if (v.neighborhoodId && (!neighborhood || neighborhood.districtId !== v.districtId)) errors.neighborhoodId = "choice";
  if (v.metroStationId && metro?.cityId !== v.cityId) errors.metroStationId = "choice";
  if (v.universityId && university?.cityId !== v.cityId) errors.universityId = "choice";
  if (prefs.length !== preferred.length || prefs.some((p) => p.cityId !== v.cityId)) errors.preferredDistrictIds = "choice";
  const currency = city?.country.currency ?? "AZN";
  const scale = amountScale(currency);
  for (const field of ["monthlyContribution", "budgetMin", "budgetMax"] as const) {
    const amount = v[field];
    if (amount == null) continue;
    if (amount < PRICE_MIN * scale) errors[field] = V.min;
    else if (amount > PRICE_MAX * scale) errors[field] = V.max;
  }
  if (Object.keys(errors).length) throw new ServiceError("validation", errors);
  return currency;
}

/**
 * Prevents near-identical duplicates: the same owner cannot have two live ads
 * of the same type with the same title.
 */
async function assertNotDuplicate(actor: Actor, input: RoommateInput, excludeId?: string) {
  const dupe = await db.roommateAd.findFirst({
    where: {
      ownerId: actor.id,
      type: input.type,
      title: { equals: input.title, mode: "insensitive" },
      status: { in: ["DRAFT", "PENDING_REVIEW", "PUBLISHED"] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (dupe) throw new ServiceError("duplicate");
}

/** Creates the ad and sends it straight to moderation. */
export async function createRoommateAd(actor: Actor, input: RoommateInput) {
  const data = normalizeRoommateInput(input);
  const preferred = input.type === "SEEKING_PARTNER" ? [...new Set(input.preferredDistrictIds)] : [];
  const currency = await assertReferences(data, preferred);
  await assertNotDuplicate(actor, input);
  const active = await db.roommateAd.count({ where: { ownerId: actor.id, status: { in: ["PENDING_REVIEW", "PUBLISHED"] } } });
  if (active >= MAX_ACTIVE_ADS) throw new ServiceError("quota");
  return db.roommateAd.create({
    data: {
      ...data,
      currency,
      ownerId: actor.id,
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      preferredDistricts: { create: preferred.map((districtId) => ({ districtId })) },
    },
    select: { id: true },
  });
}

export async function updateRoommateAd(actor: Actor, id: string, input: RoommateInput) {
  const current = await loadOwned(actor, id);
  if (current.status === "CLOSED" || current.status === "ARCHIVED") throw new ServiceError("bad_status");
  const data = normalizeRoommateInput(input);
  const preferred = input.type === "SEEKING_PARTNER" ? [...new Set(input.preferredDistrictIds)] : [];
  const currency = await assertReferences(data, preferred);
  await assertNotDuplicate(actor, input, id);
  const requeue = actor.role !== "ADMIN";
  await db.$transaction(async (tx) => {
    await tx.roommateAd.update({
      where: { id },
      data: { ...data, currency, ...(requeue ? { status: "PENDING_REVIEW", submittedAt: new Date(), rejectionReason: null } : {}) },
    });
    await tx.roommateAdDistrict.deleteMany({ where: { roommateAdId: id } });
    if (preferred.length) await tx.roommateAdDistrict.createMany({ data: preferred.map((districtId) => ({ roommateAdId: id, districtId })) });
  });
}

/** "I found someone" — the ad leaves search for good. */
export async function closeRoommateAd(actor: Actor, id: string) {
  const ad = await loadOwned(actor, id);
  if (ad.status === "CLOSED") return;
  await db.roommateAd.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
}

export async function archiveRoommateAd(actor: Actor, id: string) {
  await loadOwned(actor, id);
  await db.roommateAd.update({ where: { id }, data: { status: "ARCHIVED" } });
}

export async function renewRoommateAd(actor: Actor, id: string) {
  const ad = await loadOwned(actor, id);
  const settings = await getSettings();
  const now = new Date();
  if (ad.status === "PUBLISHED" && ad.expiresAt && ad.expiresAt > now) {
    await db.roommateAd.update({ where: { id }, data: { expiresAt: new Date(now.getTime() + settings.roommateTtlDays * 86_400_000) } });
    return { requeued: false };
  }
  if (!["PUBLISHED", "CLOSED", "ARCHIVED"].includes(ad.status)) throw new ServiceError("bad_status");
  const active = await db.roommateAd.count({ where: { ownerId: ad.ownerId, status: { in: ["PENDING_REVIEW", "PUBLISHED"] }, id: { not: id } } });
  if (active >= MAX_ACTIVE_ADS) throw new ServiceError("quota");
  await db.roommateAd.update({ where: { id }, data: { status: "PENDING_REVIEW", submittedAt: now, closedAt: null } });
  return { requeued: true };
}

export async function deleteRoommateAd(actor: Actor, id: string) {
  await loadOwned(actor, id);
  await db.roommateAd.delete({ where: { id } });
  if (actor.role === "ADMIN") await audit(actor.id, "roommate.delete", "roommate_ad", id);
}

export async function moderateRoommateAd(admin: Actor, id: string, decision: "approve" | "reject", reason?: string) {
  if (admin.role !== "ADMIN") throw new ServiceError("forbidden");
  const ad = await db.roommateAd.findUnique({ where: { id }, select: { status: true, publishedAt: true } });
  if (!ad) throw new ServiceError("not_found");
  const settings = await getSettings();
  const now = new Date();
  await db.$transaction(async (tx) => {
    if (decision === "approve") {
      await tx.roommateAd.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          rejectionReason: null,
          publishedAt: ad.publishedAt ?? now,
          expiresAt: new Date(now.getTime() + settings.roommateTtlDays * 86_400_000),
        },
      });
    } else {
      const text = reason?.trim();
      if (!text) throw new ServiceError("validation", { reason: "required" });
      await tx.roommateAd.update({ where: { id }, data: { status: "REJECTED", rejectionReason: text.slice(0, 500) } });
    }
    await audit(admin.id, `roommate.${decision}`, "roommate_ad", id, { from: ad.status, reason: reason ?? null }, tx);
  });
}
