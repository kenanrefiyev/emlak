"use server";

import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/current";
import { createContactRequest, createReport, revealAgentPhone, savedCount, setSaved, setSavedRoommate } from "@/server/engagement";
import { failure, localeFrom } from "@/server/action-utils";
import { formObject } from "@/lib/validation/helpers";
import { ServiceError, type ActionState } from "@/server/errors";
import { db } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/request-info";
import { recordListingEvent } from "@/server/listings/service";

/** Returns the user's new saved-listings count so the header badge can follow. */
export async function toggleSavedAction(listingId: string, saved: boolean): Promise<{ ok: boolean; count?: number }> {
  const user = await getCurrentUser();
  if (!user || typeof listingId !== "string") return { ok: false };
  try {
    await setSaved(user.id, listingId, Boolean(saved));
    return { ok: true, count: await savedCount(user.id) };
  } catch {
    return { ok: false };
  }
}

export async function toggleSavedRoommateAction(roommateAdId: string, saved: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || typeof roommateAdId !== "string") return { ok: false };
  try {
    await setSavedRoommate(user.id, roommateAdId, Boolean(saved));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  try {
    const user = await getCurrentUser();
    if (!user) throw new ServiceError("unauthorized");
    const t = await getTranslations({ locale, namespace: "emails" });
    const result = await createContactRequest(
      { id: user.id, role: user.role, name: user.name },
      formObject(formData),
      { locale, copy: { subject: t("contactSubject"), body: (name, link) => t("contactBody", { name, link }) } },
    );
    return { status: "ok", data: { emailDelivered: result.emailDelivered } };
  } catch (err) {
    return failure(err);
  }
}

export async function reportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ServiceError("unauthorized");
    await createReport(user.id, formObject(formData));
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function revealPhoneAction(listingId: string): Promise<{ phone?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };
  try {
    return { phone: await revealAgentPhone(user.id, listingId) };
  } catch (err) {
    return { error: err instanceof ServiceError ? err.code : "generic" };
  }
}

/** Search-result impressions: once per visitor and listing per 6 hours; owners are not counted. */
export async function recordImpressionsAction(listingIds: string[]) {
  if (!Array.isArray(listingIds)) return;
  const ids = [...new Set(listingIds.filter((id) => typeof id === "string" && /^[a-z0-9]{10,40}$/.test(id)))].slice(0, 30);
  if (!ids.length) return;
  const user = await getCurrentUser();
  const who = user?.id ?? (await clientIp());
  if (!(await rateLimit(`impr:batch:${who}`, 120, 3_600_000))) return;
  const rows = await db.listing.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, select: { id: true, ownerId: true } });
  for (const r of rows) {
    if (r.ownerId === user?.id) continue;
    if (await rateLimit(`impr:${r.id}:${who}`, 1, 6 * 3_600_000)) await recordListingEvent(r.id, "IMPRESSION", user?.id);
  }
}

/** A click on a listing's WhatsApp link. Counted as a click, not as a contact. */
export async function recordWhatsappClickAction(listingId: string) {
  if (typeof listingId !== "string" || !/^[a-z0-9]{10,40}$/.test(listingId)) return;
  const user = await getCurrentUser();
  if (!user) return;
  if (!(await rateLimit(`wa:${listingId}:${user.id}`, 1, 3_600_000))) return;
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { ownerId: true, status: true } });
  if (!listing || listing.status !== "PUBLISHED" || listing.ownerId === user.id) return;
  await recordListingEvent(listingId, "WHATSAPP_CLICK", user.id);
}

/** Counts a page view once per visitor and listing per 6 hours; owners are not counted. */
export async function recordViewAction(listingId: string) {
  if (typeof listingId !== "string" || !/^[a-z0-9]{10,40}$/.test(listingId)) return;
  const user = await getCurrentUser();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { ownerId: true, status: true } });
  if (!listing || listing.status !== "PUBLISHED" || listing.ownerId === user?.id) return;
  const who = user?.id ?? (await clientIp());
  if (!(await rateLimit(`view:${listingId}:${who}`, 1, 6 * 3_600_000))) return;
  await recordListingEvent(listingId, "VIEW", user?.id);
}
