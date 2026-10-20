import "server-only";
import { db } from "@/server/db";

export type DuplicateHint = { id: string; reason: "title" | "photo"; sameOwner: boolean };

const norm = (s: string) => s.toLocaleLowerCase("az").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Cheap duplicate signals for the moderation queue, never an automatic
 * decision: another live listing with the same original title, or a photo
 * that is byte-for-byte the same upload (uploads are re-encoded identically,
 * so equal size and dimensions mean the same source file).
 */
export async function duplicateHints(listingIds: string[]): Promise<Map<string, DuplicateHint[]>> {
  const out = new Map<string, DuplicateHint[]>();
  if (!listingIds.length) return out;
  const live = { status: { in: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"] as ("DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED")[] } };
  const targets = await db.listing.findMany({
    where: { id: { in: listingIds } },
    select: {
      id: true,
      ownerId: true,
      translations: { where: { isOriginal: true }, select: { title: true } },
      images: { where: { sizeBytes: { gt: 0 } }, select: { width: true, height: true, sizeBytes: true } },
    },
  });
  const add = (id: string, hint: DuplicateHint) => {
    const list = out.get(id) ?? [];
    if (!list.some((h) => h.id === hint.id)) list.push(hint);
    out.set(id, list);
  };

  const titles = targets.map((t) => t.translations[0]?.title).filter((s): s is string => Boolean(s));
  if (titles.length) {
    const sameTitle = await db.listingTranslation.findMany({
      where: { isOriginal: true, OR: titles.map((title) => ({ title: { equals: title, mode: "insensitive" as const } })), listing: live },
      select: { title: true, listing: { select: { id: true, ownerId: true } } },
      take: 500,
    });
    for (const t of targets) {
      const title = t.translations[0]?.title;
      if (!title) continue;
      for (const m of sameTitle) if (m.listing.id !== t.id && norm(m.title) === norm(title)) add(t.id, { id: m.listing.id, reason: "title", sameOwner: m.listing.ownerId === t.ownerId });
    }
  }

  const sigs = targets.flatMap((t) => t.images.map((i) => ({ ...i, listingId: t.id, ownerId: t.ownerId })));
  if (sigs.length) {
    const matches = await db.listingImage.findMany({
      where: { OR: sigs.map((s) => ({ width: s.width, height: s.height, sizeBytes: s.sizeBytes })), listing: live },
      select: { width: true, height: true, sizeBytes: true, listing: { select: { id: true, ownerId: true } } },
      take: 500,
    });
    for (const s of sigs)
      for (const m of matches)
        if (m.listing.id !== s.listingId && m.width === s.width && m.height === s.height && m.sizeBytes === s.sizeBytes)
          add(s.listingId, { id: m.listing.id, reason: "photo", sameOwner: m.listing.ownerId === s.ownerId });
  }
  return out;
}
